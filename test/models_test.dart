import 'package:conscious_cart/core/json.dart';
import 'package:conscious_cart/core/labels.dart';
import 'package:conscious_cart/models/analysis.dart';
import 'package:conscious_cart/models/dietary_profile.dart';
import 'package:conscious_cart/models/food.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('json helpers', () {
    test('normalizes nested maps with non-string keys', () {
      final raw = <Object?, Object?>{
        'food': <Object?, Object?>{'fdcId': 5, 'tags': ['a', 1]},
      };
      final json = asJsonMap(raw);
      expect(json['food'], isA<Map<String, dynamic>>());
      expect(asInt(asJsonMap(json['food'])['fdcId']), 5);
      expect(asStringList(asJsonMap(json['food'])['tags']), ['a']);
    });

    test('reads numbers from ints, doubles, and strings', () {
      expect(asDouble(3), 3.0);
      expect(asDouble('2.5'), 2.5);
      expect(asInt(4.9), 4);
      expect(asDouble(null), isNull);
    });
  });

  group('Food', () {
    final json = {
      'fdcId': 2345678,
      'description': 'Cola',
      'brandName': 'Fizz',
      'dataType': 'Branded',
      'servingSize': 355,
      'servingUnit': 'ml',
      'servingText': '1 can',
      'isBeverage': true,
      'per100g': {'energyKcal': 39, 'totalSugars': 10.6},
      'perServing': {'energyKcal': 140},
      'healthScore': {'score': 52, 'grade': 'E', 'method': 'beverage', 'breakdown': {'sugars': 8}},
    };

    test('parses the backend shape', () {
      final food = Food.fromJson(json);
      expect(food.per100g['totalSugars'], 10.6);
      expect(food.healthScore?.grade, 'E');
      expect(food.baseUnit, '100 ml');
      expect(food.servingLabel, '1 can (355 ml)');
      expect(food.unitFor('sodium'), 'mg');
    });

    test('summary round-trips through JSON for favorites', () {
      final summary = Food.fromJson(json).toSummary();
      final restored = FoodSummary.fromJson(summary.toJson());
      expect(restored.fdcId, 2345678);
      expect(restored.energyKcal, 39);
      expect(restored.healthScore?.score, 52);
      expect(restored.brandLine, 'Fizz');
    });

    test('missing score stays null instead of guessing', () {
      expect(HealthScore.fromJson({'grade': 'A'}), isNull);
    });
  });

  test('analysis tolerates missing lists', () {
    final result = AnalysisResult.fromJson({
      'fdcId': 1,
      'profileApplied': true,
      'analysis': {'summary': 'Fine', 'verdict': 'good'},
    });
    expect(result.analysis.verdict, 'good');
    expect(result.analysis.dietChecks, isEmpty);
  });

  test('profile equality ignores order', () {
    const first = DietaryProfile(allergens: ['milk', 'eggs'], diets: ['vegan']);
    const second = DietaryProfile(allergens: ['eggs', 'milk'], diets: ['vegan']);
    expect(first, second);
    expect(first.hashCode, second.hashCode);
    expect(first == second.copyWith(diets: []), isFalse);
  });

  test('formatAmount trims needless decimals', () {
    expect(formatAmount(140, 'kcal'), '140');
    expect(formatAmount(10.64, 'g'), '10.6 g');
    expect(formatAmount(null, 'g'), '–');
  });
}
