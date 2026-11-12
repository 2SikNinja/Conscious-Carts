"use client";

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getFirebase } from "@/lib/firebase/client";

import { toAuthError } from "./errors";

export type SessionUser = {
  uid: string;
  email: string | null;
  isGuest: boolean;
};

export type AuthStatus = "loading" | "signedIn" | "signedOut";

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Creates an account. A guest is upgraded in place so their data carries over. */
  createAccount: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSessionUser(user: User | null): SessionUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email, isGuest: user.isAnonymous };
}

/** Runs a Firebase Auth call and converts its errors into friendly ones. */
async function guard<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw toAuthError(error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let auth;
    try {
      auth = getFirebase().auth;
    } catch (error) {
      console.error(error);
      // Defer the state update so it doesn't run synchronously inside the effect.
      queueMicrotask(() => setStatus("signedOut"));
      return;
    }
    // onIdTokenChanged also fires when a guest links an email, unlike onAuthStateChanged.
    return onIdTokenChanged(auth, (firebaseUser) => {
      setUser(toSessionUser(firebaseUser));
      setStatus(firebaseUser ? "signedIn" : "signedOut");
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await guard(() => signInWithEmailAndPassword(getFirebase().auth, email.trim(), password));
  }, []);

  const createAccount = useCallback(async (email: string, password: string) => {
    const auth = getFirebase().auth;
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      const credential = EmailAuthProvider.credential(email.trim(), password);
      const result = await guard(() => linkWithCredential(current, credential));
      await result.user.getIdToken(true);
      setUser(toSessionUser(result.user));
      return;
    }
    await guard(() => createUserWithEmailAndPassword(auth, email.trim(), password));
  }, []);

  const continueAsGuest = useCallback(async () => {
    await guard(() => signInAnonymously(getFirebase().auth));
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await guard(() => sendPasswordResetEmail(getFirebase().auth, email.trim()));
  }, []);

  const signOut = useCallback(async () => {
    await guard(() => firebaseSignOut(getFirebase().auth));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, createAccount, continueAsGuest, sendPasswordReset, signOut }),
    [status, user, signIn, createAccount, continueAsGuest, sendPasswordReset, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
