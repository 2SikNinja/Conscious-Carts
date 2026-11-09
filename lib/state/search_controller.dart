import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/food.dart';
import '../services/api_service.dart';
import 'providers.dart';

class SearchState {
  const SearchState({
    this.query = '',
    this.dataType = 'all',
    this.foods = const [],
    this.pageNumber = 0,
    this.totalPages = 0,
    this.totalHits = 0,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.errorMessage,
  });

  final String query;

  /// all, branded, or generic.
  final String dataType;
  final List<FoodSummary> foods;
  final int pageNumber;
  final int totalPages;
  final int totalHits;
  final bool isLoading;
  final bool isLoadingMore;
  final String? errorMessage;

  bool get hasSearched => query.isNotEmpty;
  bool get canLoadMore => pageNumber < totalPages && !isLoading && !isLoadingMore;

  SearchState copyWith({
    String? query,
    String? dataType,
    List<FoodSummary>? foods,
    int? pageNumber,
    int? totalPages,
    int? totalHits,
    bool? isLoading,
    bool? isLoadingMore,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SearchState(
      query: query ?? this.query,
      dataType: dataType ?? this.dataType,
      foods: foods ?? this.foods,
      pageNumber: pageNumber ?? this.pageNumber,
      totalPages: totalPages ?? this.totalPages,
      totalHits: totalHits ?? this.totalHits,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class FoodSearchController extends Notifier<SearchState> {
  /// Increments on every new search so late responses from old searches are ignored.
  int _requestId = 0;

  @override
  SearchState build() => const SearchState();

  Future<void> search(String rawQuery) async {
    final query = rawQuery.trim();
    if (query.length < 2) {
      _requestId++;
      state = SearchState(dataType: state.dataType);
      return;
    }
    if (query == state.query && state.foods.isNotEmpty && state.errorMessage == null) return;
    await _runFirstPage(query, state.dataType);
  }

  Future<void> setDataType(String dataType) async {
    if (dataType == state.dataType) return;
    state = state.copyWith(dataType: dataType);
    if (state.hasSearched) await _runFirstPage(state.query, dataType);
  }

  Future<void> retry() => _runFirstPage(state.query, state.dataType);

  Future<void> _runFirstPage(String query, String dataType) async {
    final requestId = ++_requestId;
    state = SearchState(query: query, dataType: dataType, isLoading: true);
    try {
      final page = await ref.read(apiServiceProvider).searchFoods(query, dataType: dataType);
      if (requestId != _requestId) return;
      state = state.copyWith(
        foods: page.foods,
        pageNumber: page.pageNumber,
        totalPages: page.totalPages,
        totalHits: page.totalHits,
        isLoading: false,
      );
    } catch (error) {
      if (requestId != _requestId) return;
      state = state.copyWith(isLoading: false, errorMessage: friendlyError(error));
    }
  }

  Future<void> loadMore() async {
    if (!state.canLoadMore) return;
    final requestId = _requestId;
    state = state.copyWith(isLoadingMore: true, clearError: true);
    try {
      final page = await ref
          .read(apiServiceProvider)
          .searchFoods(state.query, page: state.pageNumber + 1, dataType: state.dataType);
      if (requestId != _requestId) return;
      final knownIds = state.foods.map((food) => food.fdcId).toSet();
      state = state.copyWith(
        foods: [...state.foods, ...page.foods.where((food) => !knownIds.contains(food.fdcId))],
        pageNumber: page.pageNumber,
        totalPages: page.totalPages,
        isLoadingMore: false,
      );
    } catch (error) {
      if (requestId != _requestId) return;
      state = state.copyWith(isLoadingMore: false, errorMessage: friendlyError(error));
    }
  }
}

final searchControllerProvider = NotifierProvider<FoodSearchController, SearchState>(FoodSearchController.new);
