/// Display labels and reference values shared across screens.
library;

const allergenLabels = <String, String>{
  'milk': 'Milk',
  'eggs': 'Eggs',
  'fish': 'Fish',
  'shellfish': 'Shellfish',
  'treeNuts': 'Tree nuts',
  'peanuts': 'Peanuts',
  'wheat': 'Wheat',
  'soy': 'Soy',
  'sesame': 'Sesame',
};

const dietLabels = <String, String>{
  'vegan': 'Vegan',
  'vegetarian': 'Vegetarian',
  'pescatarian': 'Pescatarian',
  'glutenFree': 'Gluten-free',
  'dairyFree': 'Dairy-free',
  'keto': 'Keto',
  'lowCarb': 'Low carb',
  'lowSodium': 'Low sodium',
  'lowSugar': 'Low sugar',
  'diabeticFriendly': 'Diabetic-friendly',
  'heartHealthy': 'Heart healthy',
  'halal': 'Halal',
  'kosher': 'Kosher',
};

const goalLabels = <String, String>{
  'loseWeight': 'Lose weight',
  'buildMuscle': 'Build muscle',
  'eatLessSugar': 'Eat less sugar',
  'eatLessSodium': 'Eat less sodium',
  'eatMoreFiber': 'Eat more fiber',
  'eatMoreProtein': 'Eat more protein',
  'eatWholeFoods': 'Eat more whole foods',
};

/// Whether a lower amount of a nutrient is the healthier direction.
enum Better { lower, higher, neutral }

class NutrientInfo {
  const NutrientInfo(this.key, this.label, this.dailyValue, this.better, {this.indent = false});

  final String key;
  final String label;

  /// FDA reference daily value for adults, in the nutrient's unit. Null when none applies.
  final double? dailyValue;
  final Better better;
  final bool indent;
}

/// Nutrition-facts order, matching the US label.
const nutrientRows = <NutrientInfo>[
  NutrientInfo('energyKcal', 'Calories', 2000, Better.lower),
  NutrientInfo('totalFat', 'Total fat', 78, Better.lower),
  NutrientInfo('saturatedFat', 'Saturated fat', 20, Better.lower, indent: true),
  NutrientInfo('transFat', 'Trans fat', null, Better.lower, indent: true),
  NutrientInfo('cholesterol', 'Cholesterol', 300, Better.lower),
  NutrientInfo('sodium', 'Sodium', 2300, Better.lower),
  NutrientInfo('carbohydrates', 'Total carbohydrates', 275, Better.neutral),
  NutrientInfo('fiber', 'Dietary fiber', 28, Better.higher, indent: true),
  NutrientInfo('totalSugars', 'Total sugars', null, Better.lower, indent: true),
  NutrientInfo('addedSugars', 'Added sugars', 50, Better.lower, indent: true),
  NutrientInfo('protein', 'Protein', 50, Better.higher),
  NutrientInfo('vitaminD', 'Vitamin D', 20, Better.higher),
  NutrientInfo('calcium', 'Calcium', 1300, Better.higher),
  NutrientInfo('iron', 'Iron', 18, Better.higher),
  NutrientInfo('potassium', 'Potassium', 4700, Better.higher),
  NutrientInfo('vitaminC', 'Vitamin C', 90, Better.higher),
];

NutrientInfo? nutrientInfoFor(String key) {
  for (final info in nutrientRows) {
    if (info.key == key) return info;
  }
  return null;
}

const defaultUnits = <String, String>{
  'energyKcal': 'kcal',
  'protein': 'g',
  'totalFat': 'g',
  'saturatedFat': 'g',
  'transFat': 'g',
  'cholesterol': 'mg',
  'carbohydrates': 'g',
  'fiber': 'g',
  'totalSugars': 'g',
  'addedSugars': 'g',
  'sodium': 'mg',
  'potassium': 'mg',
  'calcium': 'mg',
  'iron': 'mg',
  'vitaminD': 'mcg',
  'vitaminC': 'mg',
};

String formatAmount(double? value, String unit) {
  if (value == null) return '–';
  final fixed = value >= 100 || value == value.roundToDouble()
      ? value.round().toString()
      : value.toStringAsFixed(1);
  return unit == 'kcal' ? fixed : '$fixed $unit';
}

const healthDisclaimer =
    'Scores and AI analysis are informational and can be wrong. Always read the package label, '
    'and talk to a doctor or dietitian about allergies or medical diets.';
