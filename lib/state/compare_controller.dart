import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/food.dart';
import 'providers.dart';

const maxCompareItems = 4;

/// Products the user picked to compare side by side.
class CompareController extends Notifier<List<FoodSummary>> {
  @override
  List<FoodSummary> build() => const [];

  bool contains(int fdcId) => state.any((food) => food.fdcId == fdcId);

  bool get isFull => state.length >= maxCompareItems;

  /// Returns false when the list is already full.
  bool toggle(FoodSummary food) {
    if (contains(food.fdcId)) {
      remove(food.fdcId);
      return true;
    }
    if (isFull) return false;
    state = [...state, food];
    return true;
  }

  void remove(int fdcId) {
    state = state.where((food) => food.fdcId != fdcId).toList();
  }

  void clear() => state = const [];

  /// Used when opening a shared /compare?ids= link. Names fill in once details load.
  void replaceWithIds(List<int> fdcIds) {
    final current = {for (final food in state) food.fdcId: food};
    state = fdcIds
        .take(maxCompareItems)
        .map((fdcId) => current[fdcId] ?? FoodSummary(fdcId: fdcId, description: 'Loading…'))
        .toList();
  }
}

final compareProvider = NotifierProvider<CompareController, List<FoodSummary>>(CompareController.new);

final compareIdsProvider = Provider<List<int>>((ref) {
  return ref.watch(compareProvider).map((food) => food.fdcId).toList();
});

final compareFoodsProvider = FutureProvider.autoDispose<List<Food>>((ref) {
  final fdcIds = ref.watch(compareIdsProvider);
  return ref.watch(apiServiceProvider).getFoods(fdcIds);
});
