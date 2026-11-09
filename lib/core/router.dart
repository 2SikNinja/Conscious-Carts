import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/sign_in_screen.dart';
import '../features/compare/compare_screen.dart';
import '../features/favorites/favorites_screen.dart';
import '../features/food/food_detail_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/scan/scan_screen.dart';
import '../features/search/search_screen.dart';
import '../features/shell/app_shell.dart';
import '../state/providers.dart';

/// Turns the auth stream into a Listenable so the router re-checks redirects.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Stream<Object?> stream) {
    subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<Object?> subscription;

  @override
  void dispose() {
    subscription.cancel();
    super.dispose();
  }
}

/// Only allow redirects back to our own paths.
String _safeFrom(String? from) {
  if (from == null || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/sign-in')) {
    return '/search';
  }
  return from;
}

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(firebaseAuthProvider);
  final refresh = _AuthRefresh(auth.authStateChanges());
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/search',
    refreshListenable: refresh,
    redirect: (context, state) {
      final user = auth.currentUser;
      final onSignIn = state.matchedLocation == '/sign-in';
      final upgrading = state.uri.queryParameters['upgrade'] == '1';

      if (user == null) {
        if (onSignIn) return null;
        return Uri(path: '/sign-in', queryParameters: {'from': state.uri.toString()}).toString();
      }
      if (onSignIn && !(upgrading && user.isAnonymous)) {
        return _safeFrom(state.uri.queryParameters['from']);
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', redirect: (context, state) => '/search'),
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => SignInScreen(upgrade: state.uri.queryParameters['upgrade'] == '1'),
      ),
      GoRoute(path: '/scan', builder: (context, state) => const ScanScreen()),
      GoRoute(
        path: '/food/:fdcId',
        builder: (context, state) {
          final fdcId = int.tryParse(state.pathParameters['fdcId'] ?? '') ?? 0;
          return FoodDetailScreen(fdcId: fdcId);
        },
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/search', builder: (context, state) => const SearchScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/compare',
                builder: (context, state) => CompareScreen(sharedIds: state.uri.queryParameters['ids']),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/favorites', builder: (context, state) => const FavoritesScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen())],
          ),
        ],
      ),
    ],
  );
});
