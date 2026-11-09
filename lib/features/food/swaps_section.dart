import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/api_service.dart';
import '../../state/providers.dart';
import '../../state/search_controller.dart';
import '../../widgets/food_tile.dart';
import '../../widgets/states.dart';

/// Healthier alternatives, loaded on demand to save AI quota.
class SwapsSection extends ConsumerStatefulWidget {
  const SwapsSection({super.key, required this.fdcId});

  final int fdcId;

  @override
  ConsumerState<SwapsSection> createState() => _SwapsSectionState();
}

class _SwapsSectionState extends ConsumerState<SwapsSection> {
  bool requested = false;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Healthier swaps',
      icon: Icons.swap_horiz_rounded,
      child: requested ? _SwapsResults(fdcId: widget.fdcId) : _SwapsPrompt(onPressed: () => setState(() => requested = true)),
    );
  }
}

class _SwapsPrompt extends StatelessWidget {
  const _SwapsPrompt({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Find similar products that score better and fit your profile.'),
        const SizedBox(height: 12),
        FilledButton.tonalIcon(
          onPressed: onPressed,
          icon: const Icon(Icons.auto_awesome_rounded),
          label: const Text('Find swaps'),
        ),
      ],
    );
  }
}

class _SwapsResults extends ConsumerWidget {
  const _SwapsResults({required this.fdcId});

  final int fdcId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final swapsAsync = ref.watch(swapsProvider(fdcId));
    final theme = Theme.of(context);

    return swapsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Row(
          children: [
            SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5)),
            SizedBox(width: 16),
            Expanded(child: Text('Looking for better options…')),
          ],
        ),
      ),
      error: (error, stackTrace) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(friendlyError(error)),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: () => ref.invalidate(swapsProvider(fdcId)),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try again'),
          ),
        ],
      ),
      data: (result) {
        if (result.swaps.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('No product in the database clearly beat this one. You could search for:'),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final idea in result.ideas)
                    ActionChip(
                      label: Text(idea),
                      onPressed: () {
                        ref.read(searchControllerProvider.notifier).search(idea);
                        context.go('/search');
                      },
                    ),
                ],
              ),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final swap in result.swaps) ...[
              FoodTile(
                food: swap.food,
                trailingNote: _improvement(result.baseScore, swap.food.healthScore?.score, swap.reason),
              ),
              const SizedBox(height: 8),
            ],
            Text(
              'Swaps are checked against your allergens and avoid list using their ingredient labels.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        );
      },
    );
  }

  String _improvement(int? baseScore, int? swapScore, String reason) {
    if (baseScore == null || swapScore == null) return reason;
    return '+${swapScore - baseScore} points. $reason';
  }
}
