import '../core/json.dart';
import 'food.dart';

class DietaryProfile {
  const DietaryProfile({
    this.allergens = const [],
    this.diets = const [],
    this.goals = const [],
    this.avoidIngredients = const [],
  });

  final List<String> allergens;
  final List<String> diets;
  final List<String> goals;
  final List<String> avoidIngredients;

  bool get isEmpty => allergens.isEmpty && diets.isEmpty && goals.isEmpty && avoidIngredients.isEmpty;

  int get itemCount => allergens.length + diets.length + goals.length + avoidIngredients.length;

  factory DietaryProfile.fromJson(Object? value) {
    final json = asJsonMap(value);
    return DietaryProfile(
      allergens: asStringList(json['allergens']),
      diets: asStringList(json['diets']),
      goals: asStringList(json['goals']),
      avoidIngredients: asStringList(json['avoidIngredients']),
    );
  }

  Map<String, dynamic> toJson() => {
        'allergens': allergens,
        'diets': diets,
        'goals': goals,
        'avoidIngredients': avoidIngredients,
      };

  DietaryProfile copyWith({
    List<String>? allergens,
    List<String>? diets,
    List<String>? goals,
    List<String>? avoidIngredients,
  }) {
    return DietaryProfile(
      allergens: allergens ?? this.allergens,
      diets: diets ?? this.diets,
      goals: goals ?? this.goals,
      avoidIngredients: avoidIngredients ?? this.avoidIngredients,
    );
  }

  @override
  bool operator ==(Object other) {
    if (other is! DietaryProfile) return false;
    return _sameItems(allergens, other.allergens) &&
        _sameItems(diets, other.diets) &&
        _sameItems(goals, other.goals) &&
        _sameItems(avoidIngredients, other.avoidIngredients);
  }

  @override
  int get hashCode => Object.hash(
        Object.hashAllUnordered(allergens),
        Object.hashAllUnordered(diets),
        Object.hashAllUnordered(goals),
        Object.hashAllUnordered(avoidIngredients),
      );

  static bool _sameItems(List<String> first, List<String> second) {
    return first.length == second.length && first.toSet().containsAll(second);
  }
}

class FavoriteItem {
  const FavoriteItem({required this.food, required this.addedAt});

  final FoodSummary food;
  final DateTime? addedAt;
}
