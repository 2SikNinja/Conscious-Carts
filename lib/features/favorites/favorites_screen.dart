import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/dietary_profile.dart';
import '../../services/api_service.dart';
import '../../state/providers.dart';
import '../../widgets/food_tile.dart';
import '../../widgets/states.dart';

enum _SortOrder { recent, healthiest, name }

class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key});

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  _SortOrder sortOrder = _SortOrder.recent;

  List<FavoriteItem> sorted(List<FavoriteItem> items) {
    final copy = [...items];
    switch (sortOrder) {
      case _SortOrder.recent:
        break; // Already newest first from Firestore.
      case _SortOrder.healthiest:
        copy.sort((first, second) =>
            (second.food.healthScore?.score ?? -1).compareTo(first.food.healthScore?.score ?? -1));
      case _SortOrder.name:
        copy.sort((first, second) => first.food.description.toLowerCase().compareTo(second.food.description.toLowerCase()));
    }
    return copy;
  }

  @override
  Widget build(BuildContext context) {
    final favoritesAsync = ref.watch(favoritesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Favorites'),
        actions: [
          PopupMenuButton<_SortOrder>(
            tooltip: 'Sort',
            icon: const Icon(Icons.sort_rounded),
            initialValue: sortOrder,
            onSelected: (value) => setState(() => sortOrder = value),
            itemBuilder: (context) => const [
              PopupMenuItem(value: _SortOrder.recent, child: Text('Recently saved')),
              PopupMenuItem(value: _SortOrder.healthiest, child: Text('Healthiest first')),
              PopupMenuItem(value: _SortOrder.name, child: Text('Name')),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: favoritesAsync.when(
        loading: () => const LoadingState(),
        error: (error, stackTrace) => ErrorState(
          message: friendlyError(error),
          onRetry: () => ref.invalidate(favoritesProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.favorite_border_rounded,
              title: 'No favorites yet',
              message: 'Tap the heart on any product to keep it here for your next shopping trip.',
              action: FilledButton.icon(
                onPressed: () => context.go('/search'),
                icon: const Icon(Icons.search_rounded),
                label: const Text('Find products'),
              ),
            );
          }
          final list = sorted(items);
          return ContentWidth(
            maxWidth: 860,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: list.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) => FoodTile(food: list[index].food),
            ),
          );
        },
      ),
    );
  }
}
