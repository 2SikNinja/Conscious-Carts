import 'package:flutter/material.dart';

import '../core/labels.dart';
import '../models/food.dart';

/// Nutrition facts with a per-serving / per-100 toggle and % Daily Value.
class NutritionTable extends StatefulWidget {
  const NutritionTable({super.key, required this.food});

  final Food food;

  @override
  State<NutritionTable> createState() => _NutritionTableState();
}

class _NutritionTableState extends State<NutritionTable> {
  late bool showPerServing = widget.food.perServing.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final food = widget.food;
    final values = showPerServing ? food.perServing : food.per100g;
    final rows = nutrientRows.where((info) => values.containsKey(info.key)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (food.perServing.isNotEmpty)
          SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(value: true, label: Text(food.servingLabel ?? 'Per serving')),
              ButtonSegment(value: false, label: Text('Per ${food.baseUnit}')),
            ],
            selected: {showPerServing},
            onSelectionChanged: (selection) => setState(() => showPerServing = selection.first),
          )
        else
          Text('Per ${food.baseUnit}', style: theme.textTheme.labelLarge),
        const SizedBox(height: 12),
        if (rows.isEmpty)
          Text('USDA has no nutrient data for this product.', style: theme.textTheme.bodyMedium)
        else
          Table(
            columnWidths: const {0: FlexColumnWidth(3), 1: FlexColumnWidth(2), 2: IntrinsicColumnWidth()},
            defaultVerticalAlignment: TableCellVerticalAlignment.middle,
            children: [
              TableRow(
                children: [
                  const SizedBox.shrink(),
                  Text('Amount', style: theme.textTheme.labelSmall, textAlign: TextAlign.right),
                  Padding(
                    padding: const EdgeInsets.only(left: 16),
                    child: Text(showPerServing ? '% DV' : '', style: theme.textTheme.labelSmall, textAlign: TextAlign.right),
                  ),
                ],
              ),
              for (final info in rows) _row(context, info, values[info.key]!, food.unitFor(info.key)),
            ],
          ),
        if (showPerServing) ...[
          const SizedBox(height: 10),
          Text(
            '% Daily Value is based on a 2,000 calorie diet.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ],
    );
  }

  TableRow _row(BuildContext context, NutrientInfo info, double value, String unit) {
    final theme = Theme.of(context);
    final dailyPercent = showPerServing && info.dailyValue != null ? (value / info.dailyValue! * 100).round() : null;
    final isHigh = dailyPercent != null && dailyPercent >= 20 && info.better == Better.lower;
    final isGood = dailyPercent != null && dailyPercent >= 20 && info.better == Better.higher;
    final emphasis = info.indent ? FontWeight.w400 : FontWeight.w600;

    Color? percentColor;
    if (isHigh) percentColor = const Color(0xFFD7352B);
    if (isGood) percentColor = const Color(0xFF1B8A4B);

    return TableRow(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5))),
      ),
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(info.indent ? 16 : 0, 9, 8, 9),
          child: Text(info.label, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: emphasis)),
        ),
        Text(formatAmount(value, unit), textAlign: TextAlign.right, style: theme.textTheme.bodyMedium),
        Padding(
          padding: const EdgeInsets.only(left: 16),
          child: Text(
            dailyPercent == null ? '' : '$dailyPercent%',
            textAlign: TextAlign.right,
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700, color: percentColor),
          ),
        ),
      ],
    );
  }
}
