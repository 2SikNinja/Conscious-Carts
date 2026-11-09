import 'package:cloud_functions/cloud_functions.dart';

import '../core/json.dart';
import '../models/analysis.dart';
import '../models/food.dart';

/// A user-facing error with a message that is safe to show as-is.
class AppException implements Exception {
  const AppException(this.message, {this.code});

  final String message;
  final String? code;

  bool get isQuota => code == 'resource-exhausted';

  @override
  String toString() => message;
}

String friendlyError(Object error) {
  if (error is AppException) return error.message;
  if (error is FirebaseFunctionsException) return error.message ?? 'Something went wrong.';
  return 'Something went wrong. Check your connection and try again.';
}

/// Wraps the Cloud Functions backend. Every call is authenticated automatically.
class ApiService {
  ApiService(this.functions);

  final FirebaseFunctions functions;

  Future<Map<String, dynamic>> _call(String name, Map<String, dynamic> data, {Duration? timeout}) async {
    try {
      final callable = functions.httpsCallable(
        name,
        options: HttpsCallableOptions(timeout: timeout ?? const Duration(seconds: 30)),
      );
      final result = await callable.call<Object?>(data);
      return asJsonMap(result.data);
    } on FirebaseFunctionsException catch (error) {
      throw AppException(error.message ?? 'Something went wrong.', code: error.code);
    }
  }

  Future<SearchPage> searchFoods(String query, {int page = 1, String dataType = 'all'}) async {
    final json = await _call('search_foods', {'query': query, 'page': page, 'dataType': dataType});
    return SearchPage.fromJson(json);
  }

  Future<Food> getFood(int fdcId) async {
    return Food.fromJson(await _call('get_food', {'fdcId': fdcId}));
  }

  Future<List<Food>> getFoods(List<int> fdcIds) async {
    if (fdcIds.isEmpty) return const [];
    final json = await _call('get_foods', {'fdcIds': fdcIds});
    return asJsonList(json['foods']).map(Food.fromJson).toList();
  }

  /// Returns null when no product matches the barcode.
  Future<Food?> lookupBarcode(String code) async {
    final json = await _call('lookup_barcode', {'code': code});
    if (json['found'] != true) return null;
    return Food.fromJson(asJsonMap(json['food']));
  }

  Future<AnalysisResult> analyzeFood(int fdcId, {bool refresh = false}) async {
    final json = await _call(
      'analyze_food',
      {'fdcId': fdcId, 'refresh': refresh},
      timeout: const Duration(seconds: 90),
    );
    return AnalysisResult.fromJson(json);
  }

  Future<SwapsResult> suggestSwaps(int fdcId) async {
    final json = await _call('suggest_swaps', {'fdcId': fdcId}, timeout: const Duration(seconds: 90));
    return SwapsResult.fromJson(json);
  }
}
