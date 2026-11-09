import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/labels.dart';
import '../../models/dietary_profile.dart';
import '../../services/api_service.dart';
import '../../state/providers.dart';
import '../../widgets/states.dart';

/// Account info plus the dietary profile that personalizes every analysis.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  /// Local edits. Null means "no unsaved changes, show what's stored".
  DietaryProfile? draft;
  bool isSaving = false;
  final avoidController = TextEditingController();

  @override
  void dispose() {
    avoidController.dispose();
    super.dispose();
  }

  DietaryProfile current(DietaryProfile stored) => draft ?? stored;

  void edit(DietaryProfile stored, DietaryProfile Function(DietaryProfile profile) change) {
    setState(() => draft = change(current(stored)));
  }

  List<String> toggled(List<String> items, String value) {
    return items.contains(value) ? items.where((item) => item != value).toList() : [...items, value];
  }

  void addAvoidIngredient(DietaryProfile stored) {
    final value = avoidController.text.trim().toLowerCase();
    if (value.isEmpty) return;
    final existing = current(stored).avoidIngredients;
    if (existing.length >= 10) {
      showMessage(context, 'You can add up to 10 ingredients.');
      return;
    }
    if (!existing.contains(value)) {
      edit(stored, (profile) => profile.copyWith(avoidIngredients: [...existing, value]));
    }
    avoidController.clear();
  }

  Future<void> save() async {
    final uid = ref.read(currentUidProvider);
    final profile = draft;
    if (uid == null || profile == null) return;
    setState(() => isSaving = true);
    try {
      await ref.read(userRepositoryProvider).saveProfile(uid, profile);
      if (!mounted) return;
      setState(() => draft = null);
      showMessage(context, 'Profile saved. New analyses will use it.');
    } catch (error) {
      if (mounted) showMessage(context, friendlyError(error));
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);
    final stored = profileAsync.value ?? const DietaryProfile();
    final profile = current(stored);
    final hasChanges = draft != null && draft != stored;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      floatingActionButton: hasChanges
          ? FloatingActionButton.extended(
              onPressed: isSaving ? null : save,
              icon: isSaving
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check_rounded),
              label: const Text('Save changes'),
            )
          : null,
      body: profileAsync.isLoading && !profileAsync.hasValue
          ? const LoadingState()
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
              children: [
                ContentWidth(
                  maxWidth: 760,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _AccountCard(),
                      const SizedBox(height: 16),
                      SectionCard(
                        title: 'Allergies',
                        icon: Icons.warning_amber_rounded,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('We flag these in every product and never suggest swaps that contain them.'),
                            const SizedBox(height: 12),
                            _ChipGroup(
                              options: allergenLabels,
                              selected: profile.allergens,
                              onToggle: (key) => edit(stored, (value) => value.copyWith(allergens: toggled(value.allergens, key))),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      SectionCard(
                        title: 'Diets',
                        icon: Icons.restaurant_menu_rounded,
                        child: _ChipGroup(
                          options: dietLabels,
                          selected: profile.diets,
                          onToggle: (key) => edit(stored, (value) => value.copyWith(diets: toggled(value.diets, key))),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SectionCard(
                        title: 'Goals',
                        icon: Icons.flag_outlined,
                        child: _ChipGroup(
                          options: goalLabels,
                          selected: profile.goals,
                          onToggle: (key) => edit(stored, (value) => value.copyWith(goals: toggled(value.goals, key))),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SectionCard(
                        title: 'Ingredients to avoid',
                        icon: Icons.block_rounded,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('Anything else you skip, like palm oil, aspartame, or red 40.'),
                            const SizedBox(height: 12),
                            TextField(
                              controller: avoidController,
                              maxLength: 40,
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => addAvoidIngredient(stored),
                              decoration: InputDecoration(
                                hintText: 'Add an ingredient',
                                counterText: '',
                                suffixIcon: IconButton(
                                  tooltip: 'Add',
                                  icon: const Icon(Icons.add_rounded),
                                  onPressed: () => addAvoidIngredient(stored),
                                ),
                              ),
                            ),
                            if (profile.avoidIngredients.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  for (final item in profile.avoidIngredients)
                                    InputChip(
                                      label: Text(item),
                                      onDeleted: () => edit(
                                        stored,
                                        (value) => value.copyWith(
                                          avoidIngredients: value.avoidIngredients.where((entry) => entry != item).toList(),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        healthDisclaimer,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _ChipGroup extends StatelessWidget {
  const _ChipGroup({required this.options, required this.selected, required this.onToggle});

  final Map<String, String> options;
  final List<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final entry in options.entries)
          FilterChip(
            label: Text(entry.value),
            selected: selected.contains(entry.key),
            onSelected: (_) => onToggle(entry.key),
          ),
      ],
    );
  }
}

class _AccountCard extends ConsumerWidget {
  const _AccountCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authStateProvider).value;
    final isGuest = user?.isAnonymous ?? false;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Icon(isGuest ? Icons.person_outline_rounded : Icons.person_rounded,
                      color: theme.colorScheme.onPrimaryContainer),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(isGuest ? 'Guest' : (user?.email ?? 'Signed in'), style: theme.textTheme.titleMedium),
                      Text(
                        isGuest ? 'Saved on this device only, with a smaller daily AI limit.' : 'Synced across your devices.',
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.end,
              children: [
                if (isGuest)
                  FilledButton.tonal(
                    onPressed: () => context.push('/sign-in?upgrade=1'),
                    child: const Text('Create account'),
                  ),
                OutlinedButton(
                  onPressed: () async {
                    if (isGuest) {
                      final confirmed = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Sign out of guest session?'),
                          content: const Text('Your guest favorites and profile will be lost unless you create an account first.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out')),
                          ],
                        ),
                      );
                      if (confirmed != true) return;
                    }
                    await ref.read(authServiceProvider).signOut();
                  },
                  child: const Text('Sign out'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
