import 'package:cloud_firestore/cloud_firestore.dart';

import '../core/json.dart';
import '../models/dietary_profile.dart';
import '../models/food.dart';

/// Firestore layout:
///   users/{uid}                      { profile, updatedAt }
///   users/{uid}/favorites/{fdcId}    { food, addedAt }
///
/// Favorites store a summary snapshot so the list loads in one query.
class UserRepository {
  UserRepository(this.firestore);

  final FirebaseFirestore firestore;

  DocumentReference<Map<String, dynamic>> _userDoc(String uid) => firestore.collection('users').doc(uid);

  CollectionReference<Map<String, dynamic>> _favorites(String uid) => _userDoc(uid).collection('favorites');

  /// Only emits server-confirmed values. The backend reads the profile from
  /// Firestore, so reacting to an unconfirmed local write would analyze with
  /// the old profile.
  Stream<DietaryProfile> watchProfile(String uid) {
    return _userDoc(uid)
        .snapshots(includeMetadataChanges: true)
        .where((snapshot) => !snapshot.metadata.hasPendingWrites)
        .map((snapshot) => DietaryProfile.fromJson(snapshot.data()?['profile']));
  }

  Future<void> saveProfile(String uid, DietaryProfile profile) {
    return _userDoc(uid).set(
      {'profile': profile.toJson(), 'updatedAt': FieldValue.serverTimestamp()},
      SetOptions(merge: true),
    );
  }

  Stream<List<FavoriteItem>> watchFavorites(String uid) {
    return _favorites(uid).orderBy('addedAt', descending: true).limit(200).snapshots().map(
          (snapshot) => snapshot.docs.map((document) {
            final data = document.data();
            final addedAt = data['addedAt'];
            return FavoriteItem(
              food: FoodSummary.fromJson(asJsonMap(data['food'])),
              addedAt: addedAt is Timestamp ? addedAt.toDate() : null,
            );
          }).toList(),
        );
  }

  Future<void> addFavorite(String uid, FoodSummary food) {
    return _favorites(uid).doc('${food.fdcId}').set({
      'food': food.toJson(),
      'addedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> removeFavorite(String uid, int fdcId) {
    return _favorites(uid).doc('$fdcId').delete();
  }
}
