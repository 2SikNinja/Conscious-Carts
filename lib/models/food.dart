import '../core/json.dart';
import '../core/labels.dart';

class HealthScore {
  const HealthScore({
    required this.score,
    required this.grade,
    required this.method,
    required this.breakdown,
  });

  final int score;
  final String grade;
  final String method;
  final Map<String, int> breakdown;

  static HealthScore? fromJson(Object? value) {
    final json = asJsonMap(value);
    final score = asInt(json['score']);
    final grade = asString(json['grade']);
    if (score == null || grade == null) return null;
    final breakdown = <String, int>{};
    asJsonMap(json['breakdown']).forEach((key, item) {
      final points = asInt(item);
      if (points != null) breakdown[key] = points;
    });
    return HealthScore(
      score: score,
      grade: grade,
      method: asString(json['method']) ?? 'food',
      breakdown: breakdown,
    );
  }

  Map<String, dynamic> toJson() => {
        'score': score,
        'grade': grade,
        'method': method,
        'breakdown': breakdown,
      };
}

/// The compact shape used in search results, favorites, compare, and swaps.
class FoodSummary {
  const FoodSummary({
    required this.fdcId,
    required this.description,
    this.brandName,
    this.brandOwner,
    this.dataType,
    this.category,
    this.upc,
    this.energyKcal,
    this.healthScore,
  });

  final int fdcId;
  final String description;
  final String? brandName;
  final String? brandOwner;
  final String? dataType;
  final String? category;
  final String? upc;
  final double? energyKcal;
  final HealthScore? healthScore;

  bool get isBranded => dataType == 'Branded';

  String get brandLine {
    final brand = brandName ?? brandOwner;
    if (brand != null) return brand;
    return isBranded ? 'Unknown brand' : 'Whole food';
  }

  factory FoodSummary.fromJson(Map<String, dynamic> json) {
    return FoodSummary(
      fdcId: asInt(json['fdcId']) ?? 0,
      description: asString(json['description']) ?? 'Unnamed food',
      brandName: asString(json['brandName']),
      brandOwner: asString(json['brandOwner']),
      dataType: asString(json['dataType']),
      category: asString(json['category']),
      upc: asString(json['upc']),
      energyKcal: asDouble(json['energyKcal']),
      healthScore: HealthScore.fromJson(json['healthScore']),
    );
  }

  Map<String, dynamic> toJson() => {
        'fdcId': fdcId,
        'description': description,
        'brandName': brandName,
        'brandOwner': brandOwner,
        'dataType': dataType,
        'category': category,
        'upc': upc,
        'energyKcal': energyKcal,
        'healthScore': healthScore?.toJson(),
      };
}

/// The full product returned by the get_food endpoint.
class Food {
  const Food({
    required this.fdcId,
    required this.description,
    this.brandName,
    this.brandOwner,
    this.dataType,
    this.category,
    this.upc,
    this.ingredients,
    this.servingSize,
    this.servingUnit,
    this.servingText,
    this.packageWeight,
    this.publicationDate,
    this.isBeverage = false,
    this.per100g = const {},
    this.perServing = const {},
    this.units = defaultUnits,
    this.healthScore,
  });

  final int fdcId;
  final String description;
  final String? brandName;
  final String? brandOwner;
  final String? dataType;
  final String? category;
  final String? upc;
  final String? ingredients;
  final double? servingSize;
  final String? servingUnit;
  final String? servingText;
  final String? packageWeight;
  final String? publicationDate;
  final bool isBeverage;
  final Map<String, double> per100g;
  final Map<String, double> perServing;
  final Map<String, String> units;
  final HealthScore? healthScore;

  String get baseUnit => isBeverage ? '100 ml' : '100 g';

  String? get servingLabel {
    final parts = <String>[
      if (servingText != null) servingText!,
      if (servingSize != null && servingUnit != null)
        '(${formatAmount(servingSize, servingUnit!.toLowerCase())})',
    ];
    return parts.isEmpty ? null : parts.join(' ');
  }

  String unitFor(String key) => units[key] ?? defaultUnits[key] ?? '';

  factory Food.fromJson(Map<String, dynamic> json) {
    final units = asStringMap(json['units']);
    return Food(
      fdcId: asInt(json['fdcId']) ?? 0,
      description: asString(json['description']) ?? 'Unnamed food',
      brandName: asString(json['brandName']),
      brandOwner: asString(json['brandOwner']),
      dataType: asString(json['dataType']),
      category: asString(json['category']),
      upc: asString(json['upc']),
      ingredients: asString(json['ingredients']),
      servingSize: asDouble(json['servingSize']),
      servingUnit: asString(json['servingUnit']),
      servingText: asString(json['servingText']),
      packageWeight: asString(json['packageWeight']),
      publicationDate: asString(json['publicationDate']),
      isBeverage: json['isBeverage'] == true,
      per100g: asDoubleMap(json['per100g']),
      perServing: asDoubleMap(json['perServing']),
      units: units.isEmpty ? defaultUnits : units,
      healthScore: HealthScore.fromJson(json['healthScore']),
    );
  }

  FoodSummary toSummary() => FoodSummary(
        fdcId: fdcId,
        description: description,
        brandName: brandName,
        brandOwner: brandOwner,
        dataType: dataType,
        category: category,
        upc: upc,
        energyKcal: per100g['energyKcal'],
        healthScore: healthScore,
      );
}

class SearchPage {
  const SearchPage({
    required this.foods,
    required this.totalHits,
    required this.pageNumber,
    required this.totalPages,
  });

  final List<FoodSummary> foods;
  final int totalHits;
  final int pageNumber;
  final int totalPages;

  factory SearchPage.fromJson(Map<String, dynamic> json) {
    return SearchPage(
      foods: asJsonList(json['foods']).map(FoodSummary.fromJson).toList(),
      totalHits: asInt(json['totalHits']) ?? 0,
      pageNumber: asInt(json['pageNumber']) ?? 1,
      totalPages: asInt(json['totalPages']) ?? 1,
    );
  }
}
