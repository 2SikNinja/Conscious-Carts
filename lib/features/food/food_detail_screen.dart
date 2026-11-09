import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/labels.dart';
import '../../core/theme.dart';
import '../../models/food.dart';
import '../../services/api_service.dart';
import '../../state/compare_controller.dart';
import '../../state/providers.dart';
import '../../widgets/health_score_badge.dart';
import '../../widgets/nutrition_table.dart';
import '../../widgets/states.dart';
import 'analysis_section.dart';
import 'swaps_section.dart';

class FoodDetailScreen extends ConsumerWidget {
  const FoodDetailScreen({super.key, required this.fdcId});

  final int fdcId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final foodAsync = ref.watch(foodProvider(fdcId));

    return Scaffold(
      appBar: AppBar(
        leading: context.canPop()
            ? null
            : IconButton(
                tooltip: 'Home',
                icon: const Icon(Icons.home_rounded),
                onPressed: () => context.go('/search'),
              ),
        title: Text(foodAsync.value?.description ?? 'Product'),
        actions: [
          if (foodAsync.value != null) _Actions(food: foodAsync.value!),
          const SizedBox(width: 8),
        ],
      ),
      body: fdcId <= 0
          ? const EmptyState(icon: Icons.link_off_rounded, title: 'That link is not valid')
          : foodAsync.when(
              loading: () => const LoadingState(message: 'Loading product…'),
              error: (error, stackTrace) => ErrorState(
                message: friendlyError(error),
                onRetry: () => ref.invalidate(foodProvider(fdcId)),
              ),
              data: (food) => _Body(food: food),
            ),
    );
  }
}

class _Actions extends ConsumerWidget {
  const _Actions({required this.food});

  final Food food;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = food.toSummary();
    final isFavorite = ref.watch(favoriteIdsProvider.select((ids) => ids.contains(food.fdcId)));
    final isCompared = ref.watch(compareProvider.select((list) => list.any((item) => item.fdcId == food.fdcId)));

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (kIsWeb)
          IconButton(
            tooltip: 'Copy link',
            icon: const Icon(Icons.link_rounded),
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: '${Uri.base.origin}/food/${food.fdcId}'));
              if (context.mounted) showMessage(context, 'Link copied');
            },
          ),
        IconButton(
          tooltip: isCompared ? 'Remove from compare' : 'Add to compare',
          isSelected: isCompared,
          icon: const Icon(Icons.compare_arrows_rounded),
          selectedIcon: const Icon(Icons.check_circle_rounded),
          onPressed: () {
            final added = ref.read(compareProvider.notifier).toggle(summary);
            if (!added) {
              showMessage(context, 'You can compare up to $maxCompareItems products at a time.');
            } else if (!isCompared) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: const Text('Added to compare'),
                  action: SnackBarAction(label: 'View', onPressed: () => context.go('/compare')),
                ),
              );
            }
          },
        ),
        IconButton(
          tooltip: isFavorite ? 'Remove from favorites' : 'Save to favorites',
          isSelected: isFavorite,
          icon: const Icon(Icons.favorite_border_rounded),
          selectedIcon: const Icon(Icons.favorite_rounded, color: Color(0xFFD7352B)),
          onPressed: () => ref.read(favoritesActionsProvider).toggle(summary),
        ),
      ],
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.food});

  final Food food;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 900;
        final facts = [
          _Header(food: food),
          _ScoreCard(food: food),
          if (food.ingredients != null)
            SectionCard(
              title: 'Ingredients',
              icon: Icons.list_alt_rounded,
              child: SelectableText(food.ingredients!, style: Theme.of(context).textTheme.bodyMedium),
            ),
          SectionCard(title: 'Nutrition facts', icon: Icons.table_chart_outlined, child: NutritionTable(food: food)),
        ];
        final insights = [
          AnalysisSection(fdcId: food.fdcId),
          SwapsSection(fdcId: food.fdcId),
          Text(
            '$healthDisclaimer Data from USDA FoodData Central'
            '${food.publicationDate == null ? '' : ', published ${food.publicationDate}'}.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ];

        Widget column(List<Widget> children) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final child in children) ...[child, const SizedBox(height: 16)],
              ],
            );

        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          child: ContentWidth(
            maxWidth: contentMaxWidth,
            child: isWide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 5, child: column(facts)),
                      const SizedBox(width: 20),
                      Expanded(flex: 6, child: column(insights)),
                    ],
                  )
                : column([...facts, ...insights]),
          ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.food});

  final Food food;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final details = <String>[
      if (food.category != null) food.category!,
      if (food.servingLabel != null) 'Serving: ${food.servingLabel}',
      if (food.packageWeight != null) food.packageWeight!,
      if (food.upc != null) 'UPC ${food.upc}',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          food.brandName ?? food.brandOwner ?? (food.dataType == 'Branded' ? 'Packaged food' : 'Whole food'),
          style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary),
        ),
        const SizedBox(height: 4),
        Text(food.description, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        if (details.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [for (final detail in details) Chip(label: Text(detail), visualDensity: VisualDensity.compact)],
          ),
        ],
      ],
    );
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.food});

  final Food food;

  static const breakdownLabels = {
    'energy': 'Calories',
    'sugars': 'Sugars',
    'saturatedFat': 'Saturated fat',
    'sodium': 'Sodium',
    'fiber': 'Fiber',
    'protein': 'Protein',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final score = food.healthScore;

    if (score == null) {
      return const SectionCard(
        title: 'Health score',
        icon: Icons.speed_rounded,
        child: Text('USDA is missing calories, sugar, saturated fat, or sodium for this product, so it cannot be scored.'),
      );
    }

    final penalties = score.breakdown.entries.where((entry) => entry.value > 0).toList()
      ..sort((first, second) => second.value.compareTo(first.value));
    final bonuses = score.breakdown.entries.where((entry) => entry.value < 0).toList();

    return SectionCard(
      title: 'Health score',
      icon: Icons.speed_rounded,
      trailing: Tooltip(
        message: 'A simplified score inspired by Nutri-Score, based on nutrients per ${food.baseUnit}. '
            'It is not the official Nutri-Score.',
        child: Icon(Icons.info_outline_rounded, size: 20, color: theme.colorScheme.onSurfaceVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              HealthScoreScale(grade: score.grade),
              const Spacer(),
              Text(
                '${score.score}',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: BrandColors.forGrade(score.grade),
                ),
              ),
              Text(' / 100', style: theme.textTheme.titleMedium),
            ],
          ),
          if (penalties.isNotEmpty || bonuses.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in penalties)
                  _PointChip(label: breakdownLabels[entry.key] ?? entry.key, points: entry.value, isPenalty: true),
                for (final entry in bonuses)
                  _PointChip(label: breakdownLabels[entry.key] ?? entry.key, points: -entry.value, isPenalty: false),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PointChip extends StatelessWidget {
  const _PointChip({required this.label, required this.points, required this.isPenalty});

  final String label;
  final int points;
  final bool isPenalty;

  @override
  Widget build(BuildContext context) {
    final color = isPenalty ? const Color(0xFFD7352B) : const Color(0xFF1B8A4B);
    return Chip(
      avatar: Icon(isPenalty ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded, size: 16, color: color),
      label: Text('$label ${isPenalty ? '−' : '+'}$points'),
      side: BorderSide(color: color.withValues(alpha: 0.4)),
      backgroundColor: color.withValues(alpha: 0.08),
      visualDensity: VisualDensity.compact,
    );
  }
}
