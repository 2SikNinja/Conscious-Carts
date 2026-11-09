"""Dietary profile validation and simple ingredient keyword checks."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

# The nine major US allergens, with ingredient words that usually signal them.
allergenKeywords: dict[str, tuple[str, ...]] = {
    "milk": ("milk", "whey", "casein", "caseinate", "butter", "cheese", "cream", "lactose", "yogurt", "ghee"),
    "eggs": ("egg", "albumin", "ovalbumin", "mayonnaise", "meringue"),
    "fish": ("fish", "anchov", "salmon", "tuna", "cod", "tilapia", "pollock", "sardine"),
    "shellfish": ("shrimp", "crab", "lobster", "shellfish", "clam", "oyster", "mussel", "scallop", "crawfish", "prawn"),
    "treeNuts": ("almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut"),
    "peanuts": ("peanut", "groundnut"),
    "wheat": ("wheat", "semolina", "durum", "spelt", "farina", "graham", "bulgur", "couscous", "seitan"),
    "soy": ("soy", "soya", "edamame", "tofu", "tempeh", "miso"),
    "sesame": ("sesame", "tahini"),
}

# Phrases that contain an allergen keyword but are not that allergen.
# They are blanked out before scanning for the allergen they would falsely trigger.
falsePositivePhrases: dict[str, tuple[str, ...]] = {
    "milk": (
        "peanut butter", "cocoa butter", "shea butter", "apple butter", "almond butter", "nut butter",
        "coconut milk", "almond milk", "oat milk", "soy milk", "rice milk", "cashew milk",
        "coconut cream", "cream of tartar", "non-dairy", "dairy-free", "milk-free",
    ),
    "eggs": ("eggplant",),
    "peanuts": ("peanut-free",),
}

allowedAllergens = set(allergenKeywords)
allowedDiets = {
    "vegan", "vegetarian", "pescatarian", "glutenFree", "dairyFree", "keto",
    "lowCarb", "lowSodium", "lowSugar", "diabeticFriendly", "heartHealthy", "halal", "kosher",
}
allowedGoals = {"loseWeight", "buildMuscle", "eatLessSugar", "eatLessSodium", "eatMoreFiber", "eatMoreProtein", "eatWholeFoods"}

maxCustomItems = 10
maxCustomItemLength = 40


def _cleanList(value: Any, allowed: set[str] | None = None) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for entry in value:
        if not isinstance(entry, str):
            continue
        text = re.sub(r"\s+", " ", entry).strip()[:maxCustomItemLength]
        if not text:
            continue
        if allowed is not None and text not in allowed:
            continue
        if text not in items:
            items.append(text)
    return items[:maxCustomItems] if allowed is None else items


def sanitizeProfile(raw: Any) -> dict[str, list[str]]:
    """Never trust a stored profile blindly: it ends up inside a prompt."""
    raw = raw if isinstance(raw, dict) else {}
    return {
        "allergens": sorted(_cleanList(raw.get("allergens"), allowedAllergens)),
        "diets": sorted(_cleanList(raw.get("diets"), allowedDiets)),
        "goals": sorted(_cleanList(raw.get("goals"), allowedGoals)),
        "avoidIngredients": sorted(item.lower() for item in _cleanList(raw.get("avoidIngredients"))),
    }


def isEmptyProfile(profile: dict[str, list[str]]) -> bool:
    return not any(profile.values())


def profileHash(profile: dict[str, list[str]]) -> str:
    encoded = json.dumps(profile, sort_keys=True).encode()
    return hashlib.sha256(encoded).hexdigest()[:16]


def findKeywordMatches(ingredients: str | None, profile: dict[str, list[str]]) -> dict[str, list[str]]:
    """Return {allergenOrIngredient: [matched words]} found in the ingredient text.

    This is a deterministic first pass. The model double-checks it, but a keyword
    hit is shown to the user even if the model misses it.
    """
    if not ingredients:
        return {}
    text = ingredients.lower()
    matches: dict[str, list[str]] = {}
    for allergen in profile.get("allergens", []):
        scanText = text
        for phrase in falsePositivePhrases.get(allergen, ()):
            scanText = scanText.replace(phrase, " ")
        hits = [word for word in allergenKeywords.get(allergen, ()) if word in scanText]
        if hits:
            matches[allergen] = hits
    for custom in profile.get("avoidIngredients", []):
        if custom and custom in text:
            matches[custom] = [custom]
    return matches
