import 'package:firebase_auth/firebase_auth.dart';

import 'api_service.dart';

class AuthService {
  AuthService(this.auth);

  final FirebaseAuth auth;

  User? get currentUser => auth.currentUser;

  /// Also fires when a guest upgrades to a real account (same uid, new provider).
  Stream<User?> userChanges() => auth.userChanges();

  Future<void> signIn(String email, String password) {
    return _guard(() => auth.signInWithEmailAndPassword(email: email.trim(), password: password));
  }

  /// Creates an account. A guest's account is upgraded in place, so their
  /// favorites and profile carry over.
  Future<void> createAccount(String email, String password) {
    return _guard(() async {
      final current = auth.currentUser;
      if (current != null && current.isAnonymous) {
        final credential = EmailAuthProvider.credential(email: email.trim(), password: password);
        await current.linkWithCredential(credential);
      } else {
        await auth.createUserWithEmailAndPassword(email: email.trim(), password: password);
      }
    });
  }

  Future<void> continueAsGuest() => _guard(auth.signInAnonymously);

  Future<void> sendPasswordReset(String email) {
    return _guard(() => auth.sendPasswordResetEmail(email: email.trim()));
  }

  Future<void> signOut() => auth.signOut();

  Future<void> _guard(Future<Object?> Function() action) async {
    try {
      await action();
    } on FirebaseAuthException catch (error) {
      throw AppException(_messageFor(error), code: error.code);
    }
  }

  static String _messageFor(FirebaseAuthException error) {
    switch (error.code) {
      case 'invalid-email':
        return 'That email address looks invalid.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email or password is incorrect.';
      case 'email-already-in-use':
      case 'credential-already-in-use':
        return 'An account already exists for that email. Try signing in.';
      case 'weak-password':
        return 'Use a password with at least 8 characters.';
      case 'too-many-requests':
        return 'Too many attempts. Wait a moment and try again.';
      case 'network-request-failed':
        return 'No connection. Check your internet and try again.';
      case 'operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase yet.';
      default:
        return error.message ?? 'Sign-in failed. Please try again.';
    }
  }
}
