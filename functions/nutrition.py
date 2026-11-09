"""Normalize USDA FoodData Central records and compute a health score.

Everything here is pure (no network, no Firebase) so it is easy to test.
"""

from __future__ import annotations

import re
from typing import Any

# FoodData Central nutrient numbers we care about, keyed by our own field names.
# The first number listed wins; later ones are fallbacks.
nutrientNumbers: dict[str, tuple[str, ...]] = {
    "energyKcal": ("208", "958", "957"),
    "protein": ("203",),
    "totalFat": ("204",),
    "saturatedFat": ("606",),
    "transFat": ("605",),
    "cholesterol": ("601",),
    "carbohydrates": ("205",),
    "fiber": ("291",),
    "totalSugars": ("269", "2000"),
    "addedSugars": ("539",),
    "sodium": ("307",),
    "potassium": ("306",),
    "calcium": ("301",),
    "iron": ("303",),
    "vitaminD": ("328",),
    "vitaminC": ("401",),
}

nutrientUnits: dict[str, str] = {
    "energyKcal": "kcal",
    "protein": "g",
    "totalFat": "g",
    "saturatedFat": "g",
    "transFat": "g",
    "cholesterol": "mg",
    "carbohydrates": "g",
    "fiber": "g",
    "totalSugars": "g",
    "addedSugars": "g",
    "sodium": "mg",
    "potassium": "mg",
    "calcium": "mg",
    "iron": "mg",
    "vitaminD": "mcg",
    "vitaminC": "mg",
}

# labelNutrients keys (per serving, branded foods only) mapped to our names.
labelNutrientKeys: dict[str, str] = {
    "calories": "energyKcal",
    "protein": "protein",
    "fat": "totalFat",
    "saturatedFat": "saturatedFat",
    "transFat": "transFat",
    "cholesterol": "cholesterol",
    "carbohydrates": "carbohydrates",
    "fiber": "fiber",
    "sugars": "totalSugars",
    "addedSugar": "addedSugars",
    "sodium": "sodium",
    "potassium": "potassium",
    "calcium": "calcium",
    "iron": "iron",
}

beverageWords = ("beverage", "drink", "soda", "juice", "water", "tea", "coffee", "cola", "lemonade")


def cleanText(value: Any) -> str | None:
    """Trim a value to a tidy string, or None when it is blank."""
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def titleCase(value: str | None) -> str | None:
    """USDA descriptions are often ALL CAPS. Make them readable."""
    if not value:
        return value
    if value.isupper():
        return " ".join(word.capitalize() for word in value.lower().split(" "))
    return value


def normalizeUpc(value: Any) -> str | None:
    """Keep digits only and drop leading zeros so UPC-A and EAN-13 compare equal."""
    if value is None:
        return None
    digits = re.sub(r"\D", "", str(value))
    stripped = digits.lstrip("0")
    return stripped or None


def _nutrientNumberOf(item: dict[str, Any]) -> str | None:
    # Details endpoint: {"nutrient": {"number": "208"}, "amount": 1.0}
    nested = item.get("nutrient")
    if isinstance(nested, dict) and nested.get("number"):
        return str(nested["number"])
    # Search endpoint: {"nutrientNumber": "208", "value": 1.0}
    if item.get("nutrientNumber"):
        return str(item["nutrientNumber"])
    return None


def _nutrientUnitOf(item: dict[str, Any]) -> str:
    nested = item.get("nutrient")
    if isinstance(nested, dict):
        return str(nested.get("unitName", "")).lower()
    return str(item.get("unitName", "")).lower()


def _nutrientAmountOf(item: dict[str, Any]) -> float | None:
    for key in ("amount", "value"):
        value = item.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def extractPer100g(foodNutrients: list[dict[str, Any]] | None) -> dict[str, float]:
    """Pull our tracked nutrients (per 100 g or 100 ml) out of an FDC nutrient list."""
    byNumber: dict[str, tuple[float, str]] = {}
    for item in foodNutrients or []:
        if not isinstance(item, dict):
            continue
        number = _nutrientNumberOf(item)
        amount = _nutrientAmountOf(item)
        if number is None or amount is None:
            continue
        unit = _nutrientUnitOf(item)
        # Energy also appears in kJ under number 268. Only accept kcal for 208.
        if number == "208" and unit and unit != "kcal":
            continue
        byNumber.setdefault(number, (amount, unit))

    result: dict[str, float] = {}
    for fieldName, numbers in nutrientNumbers.items():
        for number in numbers:
            if number in byNumber:
                result[fieldName] = round(byNumber[number][0], 3)
                break
    return result


def extractPerServing(
    labelNutrients: dict[str, Any] | None,
    per100g: dict[str, float],
    servingSize: float | None,
    servingUnit: str | None,
) -> dict[str, float]:
    """Prefer the printed label (per serving). Fall back to scaling per-100g values."""
    result: dict[str, float] = {}
    if isinstance(labelNutrients, dict):
        for labelKey, fieldName in labelNutrientKeys.items():
            entry = labelNutrients.get(labelKey)
            if isinstance(entry, dict) and isinstance(entry.get("value"), (int, float)):
                result[fieldName] = round(float(entry["value"]), 3)

    unit = (servingUnit or "").lower()
    if servingSize and unit in ("g", "ml"):
        factor = float(servingSize) / 100.0
        for fieldName, amount in per100g.items():
            result.setdefault(fieldName, round(amount * factor, 3))
    return result


servingUnitAliases = {"grm": "g", "gm": "g", "g": "g", "mlt": "ml", "ml": "ml", "oz": "oz", "onz": "oz"}


def normalizeServingUnit(value: Any) -> str | None:
    """USDA mixes codes like GRM and MLT with plain g and ml."""
    text = cleanText(value)
    if text is None:
        return None
    return servingUnitAliases.get(text.lower(), text.lower())


def isBeverage(description: str | None, category: str | None, servingUnit: str | None) -> bool:
    text = f"{description or ''} {category or ''}".lower()
    if any(word in text for word in beverageWords):
        return True
    return servingUnit == "ml"


def _points(value: float, thresholds: list[float]) -> int:
    """Number of thresholds strictly exceeded."""
    return sum(1 for threshold in thresholds if value > threshold)


def computeHealthScore(
    per100g: dict[str, float],
    beverage: bool = False,
    description: str | None = None,
) -> dict[str, Any] | None:
    """A Nutri-Score inspired 0-100 score with an A-E grade.

    Returns None when key nutrients are missing, because a guess would mislead.
    This is a simplified, unofficial calculation meant for comparing products.
    """
    required = ("energyKcal", "totalSugars", "saturatedFat", "sodium")
    if any(name not in per100g for name in required):
        return None

    energyKj = per100g["energyKcal"] * 4.184
    sugars = per100g["totalSugars"]
    saturatedFat = per100g["saturatedFat"]
    sodium = per100g["sodium"]
    fiber = per100g.get("fiber", 0.0)
    protein = per100g.get("protein", 0.0)

    plainWater = beverage and energyKj < 1 and sugars == 0 and "water" in (description or "").lower()
    if plainWater:
        return {"score": 100, "grade": "A", "rawPoints": -15, "breakdown": {}, "method": "beverage"}

    if beverage:
        energyPoints = _points(energyKj, [30, 60, 90, 120, 150, 180, 210, 240, 270, 300])
        sugarPoints = _points(sugars, [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15])
    else:
        energyPoints = _points(energyKj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350])
        sugarPoints = _points(sugars, [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45])
    saturatedFatPoints = _points(saturatedFat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    sodiumPoints = _points(sodium, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900])
    fiberPoints = _points(fiber, [0.9, 1.9, 2.8, 3.7, 4.7])
    proteinPoints = _points(protein, [1.6, 3.2, 4.8, 6.4, 8.0])

    negativePoints = energyPoints + sugarPoints + saturatedFatPoints + sodiumPoints
    positivePoints = fiberPoints + proteinPoints
    rawPoints = negativePoints - positivePoints  # -10 (best) .. 40 (worst)

    score = round(100 * (40 - rawPoints) / 50)
    score = max(0, min(100, score))

    if beverage:
        grade = "B" if rawPoints <= 1 else "C" if rawPoints <= 5 else "D" if rawPoints <= 9 else "E"
    else:
        grade = (
            "A" if rawPoints <= -1
            else "B" if rawPoints <= 2
            else "C" if rawPoints <= 10
            else "D" if rawPoints <= 18
            else "E"
        )

    return {
        "score": score,
        "grade": grade,
        "rawPoints": rawPoints,
        "method": "beverage" if beverage else "food",
        "breakdown": {
            "energy": energyPoints,
            "sugars": sugarPoints,
            "saturatedFat": saturatedFatPoints,
            "sodium": sodiumPoints,
            "fiber": -fiberPoints,
            "protein": -proteinPoints,
        },
    }


def summarizeSearchHit(item: dict[str, Any]) -> dict[str, Any] | None:
    """Turn one FDC search result into the compact card the app lists."""
    fdcId = item.get("fdcId")
    if not isinstance(fdcId, int):
        return None
    description = titleCase(cleanText(item.get("description"))) or "Unnamed food"
    category = cleanText(item.get("foodCategory") or item.get("brandedFoodCategory"))
    servingUnit = normalizeServingUnit(item.get("servingSizeUnit"))
    per100g = extractPer100g(item.get("foodNutrients"))
    beverage = isBeverage(description, category, servingUnit)
    return {
        "fdcId": fdcId,
        "description": description,
        "brandName": titleCase(cleanText(item.get("brandName"))),
        "brandOwner": titleCase(cleanText(item.get("brandOwner"))),
        "dataType": cleanText(item.get("dataType")),
        "category": category,
        "upc": cleanText(item.get("gtinUpc")),
        "energyKcal": per100g.get("energyKcal"),
        "healthScore": computeHealthScore(per100g, beverage, description),
    }


def normalizeFoodDetails(raw: dict[str, Any]) -> dict[str, Any]:
    """Turn an FDC details record into the full food object the app renders."""
    description = titleCase(cleanText(raw.get("description"))) or "Unnamed food"
    category = cleanText(raw.get("brandedFoodCategory"))
    if category is None and isinstance(raw.get("foodCategory"), dict):
        category = cleanText(raw["foodCategory"].get("description"))
    servingSize = raw.get("servingSize") if isinstance(raw.get("servingSize"), (int, float)) else None
    servingUnit = normalizeServingUnit(raw.get("servingSizeUnit"))

    per100g = extractPer100g(raw.get("foodNutrients"))
    perServing = extractPerServing(raw.get("labelNutrients"), per100g, servingSize, servingUnit)
    beverage = isBeverage(description, category, servingUnit)

    return {
        "fdcId": raw.get("fdcId"),
        "description": description,
        "brandName": titleCase(cleanText(raw.get("brandName"))),
        "brandOwner": titleCase(cleanText(raw.get("brandOwner"))),
        "dataType": cleanText(raw.get("dataType")),
        "category": category,
        "upc": cleanText(raw.get("gtinUpc")),
        "ingredients": cleanText(raw.get("ingredients")),
        "servingSize": servingSize,
        "servingUnit": servingUnit,
        "servingText": cleanText(raw.get("householdServingFullText")),
        "packageWeight": cleanText(raw.get("packageWeight")),
        "publicationDate": cleanText(raw.get("publicationDate")),
        "isBeverage": beverage,
        "per100g": per100g,
        "perServing": perServing,
        "units": nutrientUnits,
        "healthScore": computeHealthScore(per100g, beverage, description),
    }


def compactForPrompt(food: dict[str, Any]) -> dict[str, Any]:
    """Only the fields the model needs. Smaller prompts are cheaper and more focused."""
    keys = (
        "description", "brandName", "brandOwner", "category", "ingredients",
        "servingSize", "servingUnit", "servingText", "per100g", "perServing", "healthScore",
    )
    return {key: food.get(key) for key in keys if food.get(key) not in (None, {}, "")}
