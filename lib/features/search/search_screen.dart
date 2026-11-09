import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../state/providers.dart';
import '../../state/search_controller.dart';
import '../../widgets/food_tile.dart';
import '../../widgets/states.dart';
import '../shell/app_shell.dart';

const exampleSearches = ['Greek yogurt', 'Granola', 'Oat milk', 'Tortilla chips', 'Peanut butter', 'Frozen pizza'];

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController queryController =
      TextEditingController(text: ref.read(searchControllerProvider).query);
  final scrollController = ScrollController();
  Timer? debounce;

  @override
  void initState() {
    super.initState();
    scrollController.addListener(onScroll);
  }

  @override
  void dispose() {
    debounce?.cancel();
    queryController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  void onScroll() {
    if (scrollController.position.extentAfter < 400) {
      ref.read(searchControllerProvider.notifier).loadMore();
    }
  }

  void onQueryChanged(String value) {
    debounce?.cancel();
    debounce = Timer(const Duration(milliseconds: 450), () {
      ref.read(searchControllerProvider.notifier).search(value);
    });
    setState(() {}); // Refresh the clear button.
  }

  void runSearch(String value) {
    debounce?.cancel();
    queryController.text = value;
    ref.read(searchControllerProvider.notifier).search(value);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(searchControllerProvider);
    // Keep the field in sync when a search starts elsewhere, like a swap idea chip.
    ref.listen(searchControllerProvider.select((value) => value.query), (previous, next) {
      if (next.isNotEmpty && queryController.text.trim() != next) queryController.text = next;
    });
    final profileIsEmpty = ref.watch(profileProvider.select((value) => value.value?.isEmpty ?? false));
    final isWide = MediaQuery.sizeOf(context).width >= 840;

    return Scaffold(
      appBar: AppBar(
        title: isWide ? const Text('Search') : const Wordmark(fontSize: 24),
        actions: [
          IconButton(
            tooltip: 'Scan a barcode',
            icon: const Icon(Icons.qr_code_scanner_rounded),
            onPressed: () => context.push('/scan'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ContentWidth(
        maxWidth: 860,
        child: CustomScrollView(
          controller: scrollController,
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: queryController,
                      autofocus: isWide,
                      textInputAction: TextInputAction.search,
                      onChanged: onQueryChanged,
                      onSubmitted: runSearch,
                      decoration: InputDecoration(
                        hintText: 'Search foods, brands, or ingredients',
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: queryController.text.isEmpty
                            ? null
                            : IconButton(
                                tooltip: 'Clear',
                                icon: const Icon(Icons.close_rounded),
                                onPressed: () => runSearch(''),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: SegmentedButton<String>(
                        showSelectedIcon: false,
                        segments: const [
                          ButtonSegment(value: 'all', label: Text('Everything')),
                          ButtonSegment(value: 'branded', label: Text('Brands')),
                          ButtonSegment(value: 'generic', label: Text('Whole foods')),
                        ],
                        selected: {state.dataType},
                        onSelectionChanged: (selection) =>
                            ref.read(searchControllerProvider.notifier).setDataType(selection.first),
                      ),
                    ),
                    if (profileIsEmpty) ...[
                      const SizedBox(height: 12),
                      const _ProfileNudge(),
                    ],
                  ],
                ),
              ),
            ),
            ..._results(context, state),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  List<Widget> _results(BuildContext context, SearchState state) {
    final theme = Theme.of(context);

    if (!state.hasSearched) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: Icons.shopping_basket_outlined,
            title: 'What are you shopping for?',
            message: 'Search hundreds of thousands of USDA products, or scan a barcode in the store.',
            action: Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                for (final example in exampleSearches)
                  ActionChip(label: Text(example), onPressed: () => runSearch(example)),
              ],
            ),
          ),
        ),
      ];
    }

    if (state.isLoading) {
      return [const SliverFillRemaining(hasScrollBody: false, child: LoadingState())];
    }

    if (state.errorMessage != null && state.foods.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: ErrorState(
            message: state.errorMessage!,
            onRetry: () => ref.read(searchControllerProvider.notifier).retry(),
          ),
        ),
      ];
    }

    if (state.foods.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: Icons.search_off_rounded,
            title: 'No matches for "${state.query}"',
            message: 'Try a simpler word, or switch between Brands and Whole foods.',
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
        sliver: SliverToBoxAdapter(
          child: Text(
            '${state.totalHits} results',
            style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverList.separated(
          itemCount: state.foods.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) => FoodTile(food: state.foods[index]),
        ),
      ),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: state.isLoadingMore
                ? const CircularProgressIndicator()
                : state.canLoadMore
                    ? OutlinedButton(
                        onPressed: () => ref.read(searchControllerProvider.notifier).loadMore(),
                        child: const Text('Load more'),
                      )
                    : state.errorMessage != null
                        ? Text(state.errorMessage!, style: TextStyle(color: theme.colorScheme.error))
                        : const SizedBox.shrink(),
          ),
        ),
      ),
    ];
  }
}

class _ProfileNudge extends StatelessWidget {
  const _ProfileNudge();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.secondaryContainer,
      child: ListTile(
        leading: Icon(Icons.tune_rounded, color: theme.colorScheme.onSecondaryContainer),
        title: const Text('Personalize your results'),
        subtitle: const Text('Add allergies and diets so every analysis checks them for you.'),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () => context.go('/profile'),
      ),
    );
  }
}
