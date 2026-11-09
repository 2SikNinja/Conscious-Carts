"""Conscious Cart Cloud Functions.

Every endpoint is a callable function, so Firebase verifies the caller's ID token
(including guest sessions) and the app never sees an API key. Endpoint names are
snake_case because they become deployed function IDs; variables are camelCase.
"""

from __future__ import annotations

import logging
from typing import Any

from firebase_admin import firestore, initialize_app
from firebase_functions import https_fn, options
from firebase_functions.params import IntParam, SecretParam, StringParam

from ai import AiError, GeminiService, promptVersion
from dietary_profile import findKeywordMatches, profileHash, sanitizeProfile
from fdc_client import FdcClient, FdcError
from nutrition import compactForPrompt
from store import Store

initialize_app()
options.set_global_options(region="us-central1", max_instances=10, memory=options.MemoryOption.MB_512)

usdaApiKey = SecretParam("USDA_API_KEY")
geminiApiKey = SecretParam("GEMINI_API_KEY")
geminiModel = StringParam("GEMINI_MODEL", default="gemini-3.8-flash")
dailyAiLimit = IntParam("DAILY_AI_LIMIT", default=40)
dailyGuestAiLimit = IntParam("DAILY_GUEST_AI_LIMIT", default=10)

logger = logging.getLogger("consciousCart")
maxCompareItems = 4
maxSwapResults = 6
ErrorCode = https_fn.FunctionsErrorCode


# ---------- Helpers ----------

def requireUser(request: https_fn.CallableRequest) -> tuple[str, bool]:
    if request.auth is None:
        raise https_fn.HttpsError(ErrorCode.UNAUTHENTICATED, "Please sign in or continue as a guest.")
    firebaseClaims = request.auth.token.get("firebase", {}) if request.auth.token else {}
    isGuest = firebaseClaims.get("sign_in_provider") == "anonymous"
    return request.auth.uid, isGuest


def readData(request: https_fn.CallableRequest) -> dict[str, Any]:
    return request.data if isinstance(request.data, dict) else {}


def parseFdcId(value: Any) -> int:
    try:
        fdcId = int(value)
    except (TypeError, ValueError):
        raise https_fn.HttpsError(ErrorCode.INVALID_ARGUMENT, "A valid fdcId is required.")
    if fdcId <= 0:
        raise https_fn.HttpsError(ErrorCode.INVALID_ARGUMENT, "A valid fdcId is required.")
    return fdcId


def makeFdc() -> FdcClient:
    return FdcClient(usdaApiKey.value)


def makeStore() -> Store:
    return Store(firestore.client())


def toHttpsError(error: Exception) -> https_fn.HttpsError:
    if isinstance(error, https_fn.HttpsError):
        return error
    if isinstance(error, FdcError):
        logger.warning("FDC error: %s", error)
        if error.statusCode == 429:
            return https_fn.HttpsError(ErrorCode.RESOURCE_EXHAUSTED, "The food database is busy. Try again in a minute.")
        return https_fn.HttpsError(ErrorCode.UNAVAILABLE, "The food database is unavailable right now.")
    if isinstance(error, AiError):
        logger.error("AI error: %s", error)
        return https_fn.HttpsError(ErrorCode.UNAVAILABLE, "The AI analysis is unavailable right now. Try again soon.")
    logger.exception("Unexpected error")
    return https_fn.HttpsError(ErrorCode.INTERNAL, "Something went wrong.")


def loadFood(store: Store, fdc: FdcClient, fdcId: int) -> dict[str, Any]:
    food = store.cachedFood(fdcId, lambda: fdc.getFood(fdcId))
    if not food:
        raise https_fn.HttpsError(ErrorCode.NOT_FOUND, "That food was not found.")
    return food


def chargeAi(store: Store, uid: str, isGuest: bool) -> None:
    limit = dailyGuestAiLimit.value if isGuest else dailyAiLimit.value
    if not store.consumeQuota(uid, "ai", limit):
        hint = " Create a free account for a higher limit." if isGuest else ""
        raise https_fn.HttpsError(ErrorCode.RESOURCE_EXHAUSTED, f"You've reached today's AI limit.{hint}")


# ---------- Endpoints ----------

@https_fn.on_call(secrets=[usdaApiKey])
def search_foods(request: https_fn.CallableRequest) -> dict[str, Any]:
    requireUser(request)
    data = readData(request)
    query = str(data.get("query", "")).strip()[:100]
    if len(query) < 2:
        raise https_fn.HttpsError(ErrorCode.INVALID_ARGUMENT, "Type at least 2 characters.")
    pageNumber = max(1, min(int(data.get("page", 1) or 1), 50))
    dataTypeGroup = str(data.get("dataType", "all"))
    try:
        return makeFdc().search(query, pageNumber=pageNumber, pageSize=25, dataTypeGroup=dataTypeGroup)
    except Exception as error:
        raise toHttpsError(error)


@https_fn.on_call(secrets=[usdaApiKey])
def get_food(request: https_fn.CallableRequest) -> dict[str, Any]:
    requireUser(request)
    fdcId = parseFdcId(readData(request).get("fdcId"))
    try:
        return loadFood(makeStore(), makeFdc(), fdcId)
    except Exception as error:
        raise toHttpsError(error)


@https_fn.on_call(secrets=[usdaApiKey])
def get_foods(request: https_fn.CallableRequest) -> dict[str, Any]:
    requireUser(request)
    rawIds = readData(request).get("fdcIds")
    if not isinstance(rawIds, list) or not rawIds:
        raise https_fn.HttpsError(ErrorCode.INVALID_ARGUMENT, "fdcIds must be a non-empty list.")
    fdcIds = list(dict.fromkeys(parseFdcId(value) for value in rawIds))[:maxCompareItems]
    try:
        store, fdc = makeStore(), makeFdc()
        return {"foods": [loadFood(store, fdc, fdcId) for fdcId in fdcIds]}
    except Exception as error:
        raise toHttpsError(error)


@https_fn.on_call(secrets=[usdaApiKey])
def lookup_barcode(request: https_fn.CallableRequest) -> dict[str, Any]:
    requireUser(request)
    code = "".join(character for character in str(readData(request).get("code", "")) if character.isdigit())
    if not 6 <= len(code) <= 14:
        raise https_fn.HttpsError(ErrorCode.INVALID_ARGUMENT, "That doesn't look like a product barcode.")
    try:
        store = makeStore()
        food = store.cached("barcodeCache", code, 7, lambda: makeFdc().findByUpc(code))
        return {"found": food is not None, "food": food}
    except Exception as error:
        raise toHttpsError(error)


@https_fn.on_call(secrets=[usdaApiKey, geminiApiKey], timeout_sec=90)
def analyze_food(request: https_fn.CallableRequest) -> dict[str, Any]:
    uid, isGuest = requireUser(request)
    data = readData(request)
    fdcId = parseFdcId(data.get("fdcId"))
    refresh = bool(data.get("refresh", False))
    try:
        store = makeStore()
        food = loadFood(store, makeFdc(), fdcId)
        profile = sanitizeProfile(store.readProfile(uid))
        keywordMatches = findKeywordMatches(food.get("ingredients"), profile)
        cacheKey = f"{fdcId}_{profileHash(profile)}_{promptVersion}_{geminiModel.value}".replace("/", "-")

        def produce() -> dict[str, Any]:
            chargeAi(store, uid, isGuest)
            gemini = GeminiService(geminiApiKey.value, geminiModel.value)
            return gemini.analyzeFood(compactForPrompt(food), profile, keywordMatches)

        analysis = store.cachedAnalysis(cacheKey, produce, refresh=refresh)
        return {"fdcId": fdcId, "analysis": analysis, "profileApplied": any(profile.values())}
    except Exception as error:
        raise toHttpsError(error)


@https_fn.on_call(secrets=[usdaApiKey, geminiApiKey], timeout_sec=90)
def suggest_swaps(request: https_fn.CallableRequest) -> dict[str, Any]:
    uid, isGuest = requireUser(request)
    fdcId = parseFdcId(readData(request).get("fdcId"))
    try:
        store, fdc = makeStore(), makeFdc()
        food = loadFood(store, fdc, fdcId)
        profile = sanitizeProfile(store.readProfile(uid))
        cacheKey = f"{fdcId}_{profileHash(profile)}_{promptVersion}"

        def produce() -> dict[str, Any]:
            chargeAi(store, uid, isGuest)
            ideas = GeminiService(geminiApiKey.value, geminiModel.value).suggestSwapIdeas(compactForPrompt(food), profile)
            return buildSwaps(fdc, food, profile, ideas)

        return store.cached("swapCache", cacheKey, 7, produce)
    except Exception as error:
        raise toHttpsError(error)


def buildSwaps(fdc: FdcClient, food: dict[str, Any], profile: dict[str, list[str]], ideas: list[dict[str, str]]) -> dict[str, Any]:
    """Ground the model's ideas in real USDA products that score better."""
    baseScore = (food.get("healthScore") or {}).get("score")
    candidates: list[tuple[dict[str, Any], dict[str, str]]] = []
    seenIds = {food.get("fdcId")}

    for idea in ideas:
        hits = fdc.search(idea["searchQuery"], pageSize=15, dataTypeGroup="branded")["foods"]
        scored = [hit for hit in hits if (hit.get("healthScore") or {}).get("score") is not None]
        scored.sort(key=lambda hit: hit["healthScore"]["score"], reverse=True)
        picked = 0
        for hit in scored:
            if hit["fdcId"] in seenIds:
                continue
            if baseScore is not None and hit["healthScore"]["score"] <= baseScore:
                break
            seenIds.add(hit["fdcId"])
            candidates.append((hit, idea))
            picked += 1
            if picked == 2:
                break

    # Fetch full details in one request so allergen and avoid-list checks use real ingredients.
    detailsById = {item["fdcId"]: item for item in fdc.getFoods([hit["fdcId"] for hit, _ in candidates])}
    swaps: list[dict[str, Any]] = []
    for hit, idea in candidates:
        details = detailsById.get(hit["fdcId"])
        if details is None or findKeywordMatches(details.get("ingredients"), profile):
            continue
        swaps.append({"food": hit, "reason": idea["reason"], "searchQuery": idea["searchQuery"]})
        if len(swaps) == maxSwapResults:
            break

    return {"fdcId": food.get("fdcId"), "baseScore": baseScore, "swaps": swaps, "ideas": ideas}
