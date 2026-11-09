import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/labels.dart';
import '../../core/theme.dart';
import '../../models/analysis.dart';
import '../../services/api_service.dart';
import '../../state/providers.dart';
import '../../widgets/states.dart';

class AnalysisSection extends ConsumerStatefulWidget {
  const AnalysisSection({super.key, required this.fdcId});

  final int fdcId;

  @override
  ConsumerState<AnalysisSection> createState() => _AnalysisSectionState();
}

class _AnalysisSectionState extends ConsumerState<AnalysisSection> {
  bool isRefreshing = false;

  Future<void> refresh() async {
    setState(() => isRefreshing = true);
    try {
      await ref.read(apiServiceProvider).analyzeFood(widget.fdcId, refresh: true);
      ref.invalidate(analysisProvider(widget.fdcId));
    } catch (error) {
      if (mounted) showMessage(context, friendlyError(error));
    } finally {
      if (mounted) setState(() => isRefreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final analysisAsync = ref.watch(analysisProvider(widget.fdcId));

    return SectionCard(
      title: 'AI analysis',
      icon: Icons.auto_awesome_rounded,
      trailing: analysisAsync.hasValue
          ? IconButton(
              tooltip: 'Run the analysis again',
              onPressed: isRefreshing ? null : refresh,
              icon: isRefreshing
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh_rounded),
            )
          : null,
      child: analysisAsync.when(
        loading: () => const _AnalysisLoading(),
        error: (error, stackTrace) => _AnalysisError(
          error: error,
          onRetry: () => ref.invalidate(analysisProvider(widget.fdcId)),
        ),
        data: (result) => _AnalysisBody(result: result),
      ),
    );
  }
}

class _AnalysisLoading extends StatelessWidget {
  const _AnalysisLoading();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Row(
        children: [
          const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              'Reading the label and checking it against your profile…',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _AnalysisError extends StatelessWidget {
  const _AnalysisError({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final isQuota = error is AppException && (error as AppException).isQuota;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(friendlyError(error)),
        const SizedBox(height: 12),
        if (!isQuota)
          FilledButton.tonalIcon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Try again')),
      ],
    );
  }
}

class _AnalysisBody extends StatelessWidget {
  const _AnalysisBody({required this.result});

  final AnalysisResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final analysis = result.analysis;
    final verdictColor = BrandColors.verdictColors[analysis.verdict] ?? theme.colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final alert in analysis.profileAlerts) ...[
          _AlertBanner(alert: alert),
          const SizedBox(height: 8),
        ],
        if (analysis.profileAlerts.isNotEmpty) const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: verdictColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: verdictColor.withValues(alpha: 0.35)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: verdictColor, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  analysis.verdict.toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 0.6),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(analysis.verdictReason, style: theme.textTheme.bodyMedium)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(analysis.summary, style: theme.textTheme.bodyLarge),
        if (!result.profileApplied) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => context.go('/profile'),
            icon: const Icon(Icons.tune_rounded, size: 18),
            label: const Text('Add your allergies and diets for a personal verdict'),
          ),
        ],
        if (analysis.allergens.isNotEmpty) ...[
          const SizedBox(height: 18),
          const _Label('Allergens'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final allergen in analysis.allergens)
                Chip(
                  avatar: const Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFFEF7D22)),
                  label: Text(allergen),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
        ],
        if (analysis.dietChecks.isNotEmpty) ...[
          const SizedBox(height: 18),
          const _Label('Diet fit'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [for (final check in analysis.dietChecks) _DietChip(check: check)],
          ),
        ],
        if (analysis.positives.isNotEmpty || analysis.negatives.isNotEmpty) ...[
          const SizedBox(height: 18),
          LayoutBuilder(
            builder: (context, constraints) {
              final good = _PointList(title: 'The good', points: analysis.positives, isPositive: true);
              final bad = _PointList(title: 'Watch out for', points: analysis.negatives, isPositive: false);
              if (constraints.maxWidth < 520) {
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [good, const SizedBox(height: 14), bad]);
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [Expanded(child: good), const SizedBox(width: 16), Expanded(child: bad)],
              );
            },
          ),
        ],
        if (analysis.ingredientNotes.isNotEmpty) ...[
          const SizedBox(height: 18),
          const _Label('Notable ingredients'),
          for (final note in analysis.ingredientNotes) _IngredientRow(note: note),
        ],
        if (analysis.tips.isNotEmpty) ...[
          const SizedBox(height: 18),
          const _Label('Tips'),
          for (final tip in analysis.tips)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.lightbulb_outline_rounded, size: 18, color: theme.colorScheme.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text(tip)),
                ],
              ),
            ),
        ],
      ],
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700)),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.alert});

  final ProfileAlert alert;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (alert.severity) {
      'danger' => (const Color(0xFFD7352B), Icons.dangerous_rounded),
      'warning' => (const Color(0xFFEF7D22), Icons.warning_amber_rounded),
      _ => (Theme.of(context).colorScheme.primary, Icons.info_outline_rounded),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(alert.message, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _DietChip extends StatelessWidget {
  const _DietChip({required this.check});

  final DietCheck check;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (check.status) {
      'yes' => (const Color(0xFF1B8A4B), Icons.check_circle_rounded),
      'no' => (const Color(0xFFD7352B), Icons.cancel_rounded),
      _ => (const Color(0xFF8D8D8D), Icons.help_rounded),
    };
    return Tooltip(
      message: check.reason,
      triggerMode: TooltipTriggerMode.tap,
      child: Chip(
        avatar: Icon(icon, size: 18, color: color),
        label: Text(dietLabels[check.diet] ?? check.diet),
        side: BorderSide(color: color.withValues(alpha: 0.4)),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}

class _PointList extends StatelessWidget {
  const _PointList({required this.title, required this.points, required this.isPositive});

  final String title;
  final List<String> points;
  final bool isPositive;

  @override
  Widget build(BuildContext context) {
    final color = isPositive ? const Color(0xFF1B8A4B) : const Color(0xFFEF7D22);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(title),
        if (points.isEmpty) const Text('Nothing notable.'),
        for (final point in points)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(isPositive ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded, size: 18, color: color),
                const SizedBox(width: 8),
                Expanded(child: Text(point)),
              ],
            ),
          ),
      ],
    );
  }
}

class _IngredientRow extends StatelessWidget {
  const _IngredientRow({required this.note});

  final IngredientNote note;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = switch (note.concern) {
      'high' => const Color(0xFFD7352B),
      'medium' => const Color(0xFFEF7D22),
      'low' => const Color(0xFFF2B705),
      _ => const Color(0xFF1B8A4B),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 6),
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: note.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  TextSpan(text: '  ${note.note}', style: TextStyle(color: theme.colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
