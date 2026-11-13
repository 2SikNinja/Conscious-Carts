"use client";

import { useEffect, useState } from "react";

import type { AppError } from "@/lib/auth/errors";
import { useAuth } from "@/lib/auth/auth-context";
import type { DietaryProfile } from "@/lib/profile";

import { watchProfile } from "./profile";

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: DietaryProfile }
  | { status: "error"; error: AppError };

/** The signed-in user's dietary profile, kept live with Firestore. */
export function useProfile(): ProfileState {
  const { user } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<{ uid?: string; value: ProfileState }>({ value: { status: "loading" } });

  useEffect(() => {
    if (!uid) return;
    return watchProfile(
      uid,
      (profile) => setState({ uid, value: { status: "ready", profile } }),
      (error) => setState({ uid, value: { status: "error", error } }),
    );
  }, [uid]);

  // A result for a different user (after switching accounts) counts as still loading.
  return state.uid === uid ? state.value : { status: "loading" };
}
