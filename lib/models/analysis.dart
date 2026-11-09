import '../core/json.dart';
import 'food.dart';

class IngredientNote {
  const IngredientNote({required this.name, required this.concern, required this.note});

  final String name;

  /// none, low, medium, or high.
  final String concern;
  final String note;

  factory IngredientNote.fromJson(Map<String, dynamic> json) => IngredientNote(
        name: asString(json['name']) ?? '',
        concern: asString(json['concern']) ?? 'none',
        note: asString(json['note']) ?? '',
      );
}

class DietCheck {
  const DietCheck({required this.diet, required this.status, required this.reason});

  final String diet;

  /// yes, no, or unclear.
  final String status;
  final String reason;

  factory DietCheck.fromJson(Map<String, dynamic> json) => DietCheck(
        diet: asString(json['diet']) ?? '',
        status: asString(json['status']) ?? 'unclear',
        reason: asString(json['reason']) ?? '',
      );
}

class ProfileAlert {
  const ProfileAlert({required this.severity, required this.message});

  /// info, warning, or danger.
  final String severity;
  final String message;

  factory ProfileAlert.fromJson(Map<String, dynamic> json) => ProfileAlert(
        severity: asString(json['severity']) ?? 'info',
        message: asString(json['message']) ?? '',
      );
}

class FoodAnalysis {
  const FoodAnalysis({
    required this.summary,
    required this.verdict,
    required this.verdictReason,
    required this.allergens,
    required this.ingredientNotes,
    required this.positives,
    required this.negatives,
    required this.dietChecks,
    required this.profileAlerts,
    required this.tips,
  });

  final String summary;

  /// great, good, okay, limit, or avoid.
  final String verdict;
  final String verdictReason;
  final List<String> allergens;
  final List<IngredientNote> ingredientNotes;
  final List<String> positives;
  final List<String> negatives;
  final List<DietCheck> dietChecks;
  final List<ProfileAlert> profileAlerts;
  final List<String> tips;

  factory FoodAnalysis.fromJson(Map<String, dynamic> json) => FoodAnalysis(
        summary: asString(json['summary']) ?? '',
        verdict: asString(json['verdict']) ?? 'okay',
        verdictReason: asString(json['verdictReason']) ?? '',
        allergens: asStringList(json['allergens']),
        ingredientNotes: asJsonList(json['ingredientNotes']).map(IngredientNote.fromJson).toList(),
        positives: asStringList(json['positives']),
        negatives: asStringList(json['negatives']),
        dietChecks: asJsonList(json['dietChecks']).map(DietCheck.fromJson).toList(),
        profileAlerts: asJsonList(json['profileAlerts']).map(ProfileAlert.fromJson).toList(),
        tips: asStringList(json['tips']),
      );
}

class AnalysisResult {
  const AnalysisResult({required this.fdcId, required this.analysis, required this.profileApplied});

  final int fdcId;
  final FoodAnalysis analysis;
  final bool profileApplied;

  factory AnalysisResult.fromJson(Map<String, dynamic> json) => AnalysisResult(
        fdcId: asInt(json['fdcId']) ?? 0,
        analysis: FoodAnalysis.fromJson(asJsonMap(json['analysis'])),
        profileApplied: json['profileApplied'] == true,
      );
}

class SwapSuggestion {
  const SwapSuggestion({required this.food, required this.reason, required this.searchQuery});

  final FoodSummary food;
  final String reason;
  final String searchQuery;

  factory SwapSuggestion.fromJson(Map<String, dynamic> json) => SwapSuggestion(
        food: FoodSummary.fromJson(asJsonMap(json['food'])),
        reason: asString(json['reason']) ?? '',
        searchQuery: asString(json['searchQuery']) ?? '',
      );
}

class SwapsResult {
  const SwapsResult({required this.baseScore, required this.swaps, required this.ideas});

  final int? baseScore;
  final List<SwapSuggestion> swaps;

  /// The model's raw ideas, shown as search shortcuts when no product beat the original.
  final List<String> ideas;

  factory SwapsResult.fromJson(Map<String, dynamic> json) => SwapsResult(
        baseScore: asInt(json['baseScore']),
        swaps: asJsonList(json['swaps']).map(SwapSuggestion.fromJson).toList(),
        ideas: asJsonList(json['ideas'])
            .map((idea) => asString(idea['searchQuery']))
            .whereType<String>()
            .toList(),
      );
}
