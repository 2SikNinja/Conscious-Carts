import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../state/compare_controller.dart';

/// Bottom navigation on phones, a side rail on wide screens.
///
/// "Scan" opens a full-screen camera route instead of a tab, so the camera
/// only runs while that page is open.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  // Destination order: Search, Scan, Compare, Favorites, Profile.
  // Branch order:      Search,       Compare, Favorites, Profile.
  static const scanDestination = 1;

  int get _selectedDestination {
    final branch = navigationShell.currentIndex;
    return branch == 0 ? 0 : branch + 1;
  }

  void _onDestinationSelected(BuildContext context, int destination) {
    if (destination == scanDestination) {
      context.push('/scan');
      return;
    }
    final branch = destination == 0 ? 0 : destination - 1;
    navigationShell.goBranch(branch, initialLocation: branch == navigationShell.currentIndex);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final compareCount = ref.watch(compareProvider.select((list) => list.length));
    final isWide = MediaQuery.sizeOf(context).width >= wideBreakpoint;

    Widget compareIcon(IconData icon) => Badge(
          isLabelVisible: compareCount > 0,
          label: Text('$compareCount'),
          child: Icon(icon),
        );

    if (isWide) {
      final extended = MediaQuery.sizeOf(context).width >= 1100;
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              extended: extended,
              labelType: extended ? NavigationRailLabelType.none : NavigationRailLabelType.all,
              selectedIndex: _selectedDestination,
              onDestinationSelected: (index) => _onDestinationSelected(context, index),
              leading: const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: _RailLogo(),
              ),
              destinations: [
                const NavigationRailDestination(
                  icon: Icon(Icons.search_rounded),
                  label: Text('Search'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.qr_code_scanner_rounded),
                  label: Text('Scan'),
                ),
                NavigationRailDestination(
                  icon: compareIcon(Icons.compare_arrows_rounded),
                  label: const Text('Compare'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.favorite_border_rounded),
                  selectedIcon: Icon(Icons.favorite_rounded),
                  label: Text('Favorites'),
                ),
                const NavigationRailDestination(
                  icon: Icon(Icons.person_outline_rounded),
                  selectedIcon: Icon(Icons.person_rounded),
                  label: Text('Profile'),
                ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: navigationShell),
          ],
        ),
      );
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedDestination,
        onDestinationSelected: (index) => _onDestinationSelected(context, index),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.search_rounded), label: 'Search'),
          const NavigationDestination(icon: Icon(Icons.qr_code_scanner_rounded), label: 'Scan'),
          NavigationDestination(icon: compareIcon(Icons.compare_arrows_rounded), label: 'Compare'),
          const NavigationDestination(
            icon: Icon(Icons.favorite_border_rounded),
            selectedIcon: Icon(Icons.favorite_rounded),
            label: 'Favorites',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _RailLogo extends StatelessWidget {
  const _RailLogo();

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Conscious Cart',
      child: ClipOval(
        child: Image.asset('assets/images/logo.png', width: 48, height: 48, semanticLabel: 'Conscious Cart logo'),
      ),
    );
  }
}

/// The wordmark used on the sign-in page and app bars.
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, this.fontSize = 26});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Text(
      'Conscious Cart',
      style: TextStyle(
        fontFamily: 'Pacifico',
        fontSize: fontSize,
        color: Theme.of(context).colorScheme.primary,
      ),
    );
  }
}
