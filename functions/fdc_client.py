"""Thin client for the USDA FoodData Central API."""

from __future__ import annotations

from typing import Any

import requests

from nutrition import normalizeFoodDetails, normalizeUpc, summarizeSearchHit

baseUrl = "https://api.nal.usda.gov/fdc/v1"
requestTimeoutSeconds = 12

dataTypeGroups: dict[str, list[str]] = {
    "all": ["Branded", "Foundation", "SR Legacy"],
    "branded": ["Branded"],
    "generic": ["Foundation", "SR Legacy"],
}


class FdcError(Exception):
    """Raised when FoodData Central fails or returns something unusable."""

    def __init__(self, message: str, statusCode: int | None = None):
        super().__init__(message)
        self.statusCode = statusCode


class FdcClient:
    def __init__(self, apiKey: str, session: requests.Session | None = None):
        if not apiKey:
            raise FdcError("USDA API key is not configured")
        self.apiKey = apiKey
        self.session = session or requests.Session()

    def _request(self, method: str, path: str, jsonBody: dict[str, Any] | None = None) -> Any:
        try:
            response = self.session.request(
                method,
                f"{baseUrl}{path}",
                params={"api_key": self.apiKey},
                json=jsonBody,
                timeout=requestTimeoutSeconds,
            )
        except requests.RequestException as error:
            raise FdcError(f"Could not reach FoodData Central: {error}") from error

        if response.status_code == 404:
            return None
        if response.status_code == 429:
            raise FdcError("FoodData Central rate limit reached", 429)
        if response.status_code >= 400:
            raise FdcError(f"FoodData Central returned {response.status_code}", response.status_code)
        try:
            return response.json()
        except ValueError as error:
            raise FdcError("FoodData Central returned invalid JSON") from error

    def search(self, query: str, pageNumber: int = 1, pageSize: int = 25, dataTypeGroup: str = "all") -> dict[str, Any]:
        body = {
            "query": query,
            "dataType": dataTypeGroups.get(dataTypeGroup, dataTypeGroups["all"]),
            "pageSize": pageSize,
            "pageNumber": pageNumber,
        }
        payload = self._request("POST", "/foods/search", body) or {}

        seenKeys: set[tuple[str, str]] = set()
        foods: list[dict[str, Any]] = []
        for item in payload.get("foods", []):
            summary = summarizeSearchHit(item)
            if summary is None:
                continue
            dedupeKey = (summary["description"].lower(), (summary.get("brandOwner") or "").lower())
            if dedupeKey in seenKeys:
                continue
            seenKeys.add(dedupeKey)
            foods.append(summary)

        return {
            "foods": foods,
            "totalHits": payload.get("totalHits", len(foods)),
            "pageNumber": payload.get("currentPage", pageNumber),
            "totalPages": payload.get("totalPages", 1),
        }

    def getFood(self, fdcId: int) -> dict[str, Any] | None:
        raw = self._request("GET", f"/food/{fdcId}?format=full")
        if not raw:
            return None
        return normalizeFoodDetails(raw)

    def getFoods(self, fdcIds: list[int]) -> list[dict[str, Any]]:
        if not fdcIds:
            return []
        rawList = self._request("POST", "/foods", {"fdcIds": fdcIds, "format": "full"}) or []
        byId = {item.get("fdcId"): normalizeFoodDetails(item) for item in rawList if isinstance(item, dict)}
        # Keep the caller's order and skip ids USDA did not return.
        return [byId[fdcId] for fdcId in fdcIds if fdcId in byId]

    def findByUpc(self, code: str) -> dict[str, Any] | None:
        wanted = normalizeUpc(code)
        if not wanted:
            return None
        payload = self._request(
            "POST",
            "/foods/search",
            {"query": wanted, "dataType": ["Branded"], "pageSize": 25},
        ) or {}
        for item in payload.get("foods", []):
            if normalizeUpc(item.get("gtinUpc")) == wanted and isinstance(item.get("fdcId"), int):
                return self.getFood(item["fdcId"])
        return None
