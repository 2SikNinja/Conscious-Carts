import 'package:fl_chart/fl_chart.dart';
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
import '../../widgets/health_score_badge.dart';
import '../../widgets/states.dart';

/// Nutrients offered in the chart, all compared per 100 g or ml.
const chartNutrients = ['energyKcal', 'totalSugars', 'saturatedFat', 'sodium', 'protein', 'fiber'];

/// Rows in the comparison table.
const tableNutrients = [
  'energyKcal', 'totalFat', 'saturatedFat', 'sodium', 'carbohydrates', 'fiber', 'totalSugars', 'addedSugars', 'protein',
];

class CompareScreen extends ConsumerStatefulWidget {
  const CompareScreen({super.key, this.sharedIds});

  /// Comma-separated FDC ids from a shared /compare?ids= link.
  final String? sharedIds;

  @override
  ConsumerState<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends ConsumerState<CompareScreen> {
  String chartNutrient = 'totalSugars';

  @override
  void initState() {
    super.initState();
    final ids = (widget.sharedIds ?? '')
        .split(',')
        .map((value) => int.tryParse(value.trim()))
        .whereType<int>()
        .where((value) => value > 0)
        .toList();
    if (ids.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) ref.read(compareProvider.notifier).replaceWithIds(ids);
      });
    }
  }

  Future<void> copyLink(List<int> ids) async {
    await Clipboard.setData(ClipboardData(text: '${Uri.base.origin}/compare?ids=${ids.join(',')}'));
    if (mounted) showMessage(context, 'Comparison link copied');
  }

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(compareProvider);
    final ids = ref.watch(compareIdsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Compare'),
        actions: [
          if (kIsWeb && selected.length > 1)
            IconButton(tooltip: 'Copy link', icon: const Icon(Icons.link_rounded), onPressed: () => copyLink(ids)),
          if (selected.isNotEmpty)
            TextButton(onPressed: () => ref.read(compareProvider.notifier).clear(), child: const Text('Clear')),
          const SizedBox(width: 8),
        ],
      ),
      body: selected.isEmpty
          ? EmptyState(
              icon: Icons.compare_arrows_rounded,
              title: 'Nothing to compare yet',
              message: 'Tap the compare icon on up to $maxCompareItems products to see them side by side.',
              action: FilledButton.icon(
                onPressed: () => context.go('/search'),
                icon: const Icon(Icons.search_rounded),
                label: const Text('Find products'),
              ),
            )
          : ref.watch(compareFoodsProvider).when(
                skipLoadingOnReload: true,
                loading: () => const LoadingState(message: 'Loading nutrition data…'),
                error: (error, stackTrace) => ErrorState(
                  message: friendlyError(error),
                  onRetry: () => ref.invalidate(compareFoodsProvider),
                ),
                data: (foods) => _CompareBody(
                  foods: foods,
                  chartNutrient: chartNutrient,
                  onChartNutrientChanged: (value) => setState(() => chartNutrient = value),
                ),
              ),
    );
  }
}

class _CompareBody extends ConsumerWidget {
  const _CompareBody({required this.foods, required this.chartNutrient, required this.onChartNutrientChanged});

  final List<Food> foods;
  final String chartNutrient;
  final ValueChanged<String> onChartNutrientChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scored = foods.where((food) => food.healthScore != null).toList()
      ..sort((first, second) => second.healthScore!.score.compareTo(first.healthScore!.score));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: ContentWidth(
        maxWidth: contentMaxWidth,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (foods.length == 1)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text('Add at least one more product to compare.'),
              ),
            if (scored.length > 1) ...[
              _WinnerCard(best: scored.first, runnerUp: scored[1]),
              const SizedBox(height: 16),
            ],
            SectionCard(
              title: 'Side by side',
              icon: Icons.table_rows_rounded,
              child: _CompareTable(foods: foods),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Chart',
              icon: Icons.bar_chart_rounded,
              child: _NutrientChart(foods: foods, nutrient: chartNutrient, onNutrientChanged: onChartNutrientChanged),
            ),
          ],
        ),
      ),
    );
  }
}

class _WinnerCard extends StatelessWidget {
  const _WinnerCard({required this.best, required this.runnerUp});

  final Food best;
  final Food runnerUp;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gap = best.healthScore!.score - runnerUp.healthScore!.score;
    final text = gap == 0
        ? '${best.description} and ${runnerUp.description} are tied on the health score.'
        : '${best.description} scores $gap points higher than the next best option.';
    return Card(
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            HealthScoreBadge(healthScore: best.healthScore, size: 52),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    gap == 0 ? 'It\'s a tie' : 'Healthiest pick',
                    style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.onPrimaryContainer),
                  ),
                  const SizedBox(height: 2),
                  Text(text, style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onPrimaryContainer)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompareTable extends ConsumerWidget {
  const _CompareTable({required this.foods});

  final List<Food> foods;

  /// Index of the healthiest value for a nutrient, or null when there's no clear winner.
  static int? bestIndex(List<Food> foods, String key) {
    final info = nutrientInfoFor(key);
    if (info == null || info.better == Better.neutral) return null;
    int? best;
    for (var index = 0; index < foods.length; index++) {
      final value = foods[index].per100g[key];
      if (value == null) continue;
      final current = best == null ? null : foods[best].per100g[key];
      final isBetter = current == null || (info.better == Better.lower ? value < current : value > current);
      if (isBetter) best = index;
    }
    final valueCount = foods.where((food) => food.per100g[key] != null).length;
    return valueCount > 1 ? best : null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    const columnWidth = 150.0;
    const labelWidth = 130.0;

    Widget cell(String text, {bool highlight = false, Alignment alignment = Alignment.centerRight}) => Container(
          width: columnWidth,
          alignment: alignment,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: highlight
              ? BoxDecoration(
                  color: const Color(0xFF1B8A4B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                )
              : null,
          child: Text(
            text,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: highlight ? FontWeight.w800 : FontWeight.w400,
              color: highlight ? const Color(0xFF1B8A4B) : null,
            ),
          ),
        );

    Widget label(String text) => SizedBox(
          width: labelWidth,
          child: Text(text, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
        );

    final bestScoreIndex = () {
      final scores = foods.map((food) => food.healthScore?.score).toList();
      if (scores.whereType<int>().length < 2) return null;
      var best = -1;
      for (var index = 0; index < scores.length; index++) {
        if (scores[index] != null && (best < 0 || scores[index]! > scores[best]!)) best = index;
      }
      return best < 0 ? null : best;
    }();

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(width: labelWidth),
              for (final food in foods) _ColumnHeader(food: food, width: columnWidth),
            ],
          ),
          const Divider(height: 24),
          Row(
            children: [
              label('Health score'),
              for (var index = 0; index < foods.length; index++)
                cell(
                  foods[index].healthScore == null
                      ? '–'
                      : '${foods[index].healthScore!.grade}  ·  ${foods[index].healthScore!.score}',
                  highlight: index == bestScoreIndex,
                ),
            ],
          ),
          for (final key in tableNutrients)
            if (foods.any((food) => food.per100g.containsKey(key)))
              Row(
                children: [
                  label(nutrientInfoFor(key)?.label ?? key),
                  for (var index = 0; index < foods.length; index++)
                    cell(
                      formatAmount(foods[index].per100g[key], foods[index].unitFor(key)),
                      highlight: index == bestIndex(foods, key),
                    ),
                ],
              ),
          const SizedBox(height: 8),
          Text(
            'Values per 100 g (or 100 ml for drinks). Green marks the healthiest value in each row.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ColumnHeader extends ConsumerWidget {
  const _ColumnHeader({required this.food, required this.width});

  final Food food;
  final double width;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return SizedBox(
      width: width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                HealthScoreBadge(healthScore: food.healthScore, size: 30),
                const Spacer(),
                IconButton(
                  tooltip: 'Remove',
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  onPressed: () => ref.read(compareProvider.notifier).remove(food.fdcId),
                ),
              ],
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: () => context.push('/food/${food.fdcId}'),
              child: Text(
                food.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  decoration: TextDecoration.underline,
                  decorationColor: theme.colorScheme.outlineVariant,
                ),
              ),
            ),
            Text(
              food.brandName ?? food.brandOwner ?? 'Whole food',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _NutrientChart extends StatelessWidget {
  const _NutrientChart({required this.foods, required this.nutrient, required this.onNutrientChanged});

  final List<Food> foods;
  final String nutrient;
  final ValueChanged<String> onNutrientChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final values = foods.map((food) => food.per100g[nutrient]).toList();
    final maxValue = values.whereType<double>().fold<double>(0, (current, value) => value > current ? value : current);
    final unit = defaultUnits[nutrient] ?? '';
    final info = nutrientInfoFor(nutrient);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final key in chartNutrients)
              ChoiceChip(
                label: Text(nutrientInfoFor(key)?.label ?? key),
                selected: key == nutrient,
                onSelected: (_) => onNutrientChanged(key),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          '${info?.label ?? nutrient} per 100 g (${unit == 'kcal' ? 'kcal' : unit})'
          '${info?.better == Better.lower ? ', lower is better' : info?.better == Better.higher ? ', higher is better' : ''}',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 20),
        SizedBox(
          height: 240,
          child: maxValue == 0
              ? Center(child: Text('None of these products report ${info?.label.toLowerCase() ?? nutrient}.'))
              : BarChart(
                  BarChartData(
                    maxY: maxValue * 1.15,
                    alignment: BarChartAlignment.spaceAround,
                    barTouchData: BarTouchData(enabled: true),
                    gridData: FlGridData(
                      drawVerticalLine: false,
                      getDrawingHorizontalLine: (value) => FlLine(
                        color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                        strokeWidth: 1,
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(),
                      rightTitles: const AxisTitles(),
                      leftTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 44,
                          getTitlesWidget: (value, meta) => Text(
                            meta.formattedValue,
                            style: theme.textTheme.labelSmall,
                          ),
                        ),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 36,
                          getTitlesWidget: (value, meta) {
                            final index = value.toInt();
                            if (index < 0 || index >= foods.length) return const SizedBox.shrink();
                            final name = foods[index].description;
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                name.length > 16 ? '${name.substring(0, 15)}…' : name,
                                style: theme.textTheme.labelSmall,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: [
                      for (var index = 0; index < foods.length; index++)
                        BarChartGroupData(
                          x: index,
                          barRods: [
                            BarChartRodData(
                              toY: values[index] ?? 0,
                              width: 34,
                              color: BrandColors.forGrade(foods[index].healthScore?.grade),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
