"use client";

import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { AppError } from "@/lib/auth/errors";
import { getFirebase } from "@/lib/firebase/client";
import { parseProfile, type DietaryProfile } from "@/lib/profile";

/**
 * Firestore layout: users/{uid} = { profile, updatedAt }.
 * firestore.rules only lets a user read and write their own document.
 */
function userDoc(uid: string) {
  return doc(getFirebase().firestore, "users", uid);
}

/** Streams the user's profile. Returns an unsubscribe function. */
export function watchProfile(
  uid: string,
  onProfile: (profile: DietaryProfile) => void,
  onError: (error: AppError) => void,
): () => void {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => onProfile(parseProfile(snapshot.data()?.profile)),
    () => onError(new AppError("Couldn't load your profile. Check your connection and try again.")),
  );
}

/** Saves the profile. Resolves once the server confirms the write. */
export async function saveProfile(uid: string, profile: DietaryProfile): Promise<void> {
  try {
    await setDoc(userDoc(uid), { profile, updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    throw new AppError("Couldn't save your profile. Please try again.");
  }
}
