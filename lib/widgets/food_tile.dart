import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/food.dart';
import '../state/compare_controller.dart';
import '../state/providers.dart';
import 'health_score_badge.dart';
import 'states.dart';

/// A product row with quick favorite and compare actions.
class FoodTile extends ConsumerWidget {
  const FoodTile({super.key, required this.food, this.subtitle, this.trailingNote});

  final FoodSummary food;

  /// Overrides the default brand and calories line.
  final String? subtitle;

  /// Optional extra line, for example a swap reason.
  final String? trailingNote;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isFavorite = ref.watch(favoriteIdsProvider.select((ids) => ids.contains(food.fdcId)));
    final isCompared = ref.watch(compareProvider.select((list) => list.any((item) => item.fdcId == food.fdcId)));
    final calories = food.energyKcal == null ? null : '${food.energyKcal!.round()} kcal / 100 g';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/food/${food.fdcId}'),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              HealthScoreBadge(healthScore: food.healthScore),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      food.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle ?? [food.brandLine, if (calories != null) calories].join('  ·  '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    if (trailingNote != null) ...[
                      const SizedBox(height: 6),
                      Text(trailingNote!, style: theme.textTheme.bodySmall),
                    ],
                  ],
                ),
              ),
              IconButton(
                tooltip: isCompared ? 'Remove from compare' : 'Add to compare',
                isSelected: isCompared,
                icon: const Icon(Icons.compare_arrows_rounded),
                selectedIcon: Icon(Icons.check_circle_rounded, color: theme.colorScheme.primary),
                onPressed: () {
                  final added = ref.read(compareProvider.notifier).toggle(food);
                  if (!added) showMessage(context, 'You can compare up to $maxCompareItems products at a time.');
                },
              ),
              IconButton(
                tooltip: isFavorite ? 'Remove from favorites' : 'Save to favorites',
                isSelected: isFavorite,
                icon: const Icon(Icons.favorite_border_rounded),
                selectedIcon: const Icon(Icons.favorite_rounded, color: Color(0xFFD7352B)),
                onPressed: () => ref.read(favoritesActionsProvider).toggle(food),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
