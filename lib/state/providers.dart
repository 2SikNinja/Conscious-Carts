import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/analysis.dart';
import '../models/dietary_profile.dart';
import '../models/food.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/user_repository.dart';

// ---------- Firebase singletons ----------

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

final firestoreProvider = Provider<FirebaseFirestore>((ref) => FirebaseFirestore.instance);

final functionsProvider = Provider<FirebaseFunctions>(
  (ref) => FirebaseFunctions.instanceFor(region: 'us-central1'),
);

// ---------- Services ----------

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref.watch(firebaseAuthProvider)));

final apiServiceProvider = Provider<ApiService>((ref) => ApiService(ref.watch(functionsProvider)));

final userRepositoryProvider = Provider<UserRepository>((ref) => UserRepository(ref.watch(firestoreProvider)));

// ---------- Session ----------

final authStateProvider = StreamProvider<User?>((ref) => ref.watch(authServiceProvider).userChanges());

/// The signed-in user's id, or null while signed out.
final currentUidProvider = Provider<String?>((ref) => ref.watch(authStateProvider).value?.uid);

final isGuestProvider = Provider<bool>((ref) => ref.watch(authStateProvider).value?.isAnonymous ?? false);

final profileProvider = StreamProvider<DietaryProfile>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const DietaryProfile());
  return ref.watch(userRepositoryProvider).watchProfile(uid);
});

final favoritesProvider = StreamProvider<List<FavoriteItem>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return Stream.value(const <FavoriteItem>[]);
  return ref.watch(userRepositoryProvider).watchFavorites(uid);
});

final favoriteIdsProvider = Provider<Set<int>>((ref) {
  final favorites = ref.watch(favoritesProvider).value ?? const <FavoriteItem>[];
  return favorites.map((item) => item.food.fdcId).toSet();
});

// ---------- Food data ----------

final foodProvider = FutureProvider.autoDispose.family<Food, int>((ref, fdcId) {
  return ref.watch(apiServiceProvider).getFood(fdcId);
});

/// The profile once it has loaded, or null while loading. Providers only notify
/// when the value actually changes, so unrelated user-doc writes don't refetch.
final readyProfileProvider = Provider<DietaryProfile?>((ref) {
  final profile = ref.watch(profileProvider);
  if (profile.hasValue) return profile.value;
  if (profile.hasError) return const DietaryProfile();
  return null;
});

/// Re-runs when the profile changes, because the backend tailors the analysis to it.
/// Waits for the profile first so a cold start doesn't fire two AI requests.
final analysisProvider = FutureProvider.autoDispose.family<AnalysisResult, int>((ref, fdcId) {
  final profile = ref.watch(readyProfileProvider);
  if (profile == null) return Completer<AnalysisResult>().future;
  return ref.watch(apiServiceProvider).analyzeFood(fdcId);
});

final swapsProvider = FutureProvider.autoDispose.family<SwapsResult, int>((ref, fdcId) {
  final profile = ref.watch(readyProfileProvider);
  if (profile == null) return Completer<SwapsResult>().future;
  return ref.watch(apiServiceProvider).suggestSwaps(fdcId);
});

// ---------- Actions ----------

/// Small helper so widgets don't each repeat the uid lookup for favorites.
class FavoritesActions {
  FavoritesActions(this.ref);

  final Ref ref;

  Future<void> toggle(FoodSummary food) async {
    final uid = ref.read(currentUidProvider);
    if (uid == null) return;
    final repository = ref.read(userRepositoryProvider);
    if (ref.read(favoriteIdsProvider).contains(food.fdcId)) {
      await repository.removeFavorite(uid, food.fdcId);
    } else {
      await repository.addFavorite(uid, food);
    }
  }
}

final favoritesActionsProvider = Provider<FavoritesActions>((ref) => FavoritesActions(ref));
