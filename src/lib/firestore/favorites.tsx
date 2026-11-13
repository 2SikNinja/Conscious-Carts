"use client";

import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { FoodSummary } from "@/lib/api/schemas";
import { useAuth } from "@/lib/auth/auth-context";
import { AppError } from "@/lib/auth/errors";
import { parseFavorite, toFavoriteSnapshot, type Favorite } from "@/lib/favorites";
import { getFirebase } from "@/lib/firebase/client";

const maxFavorites = 200;
const loadingState = { status: "loading" } as const;

type FavoritesState =
  | { status: "loading" }
  | { status: "ready"; favorites: Favorite[] }
  | { status: "error"; error: AppError };

type FavoritesContextValue = {
  state: FavoritesState;
  isFavorite: (fdcId: number) => boolean;
  /** Adds or removes a favorite. Firestore applies the change locally right away. */
  toggleFavorite: (food: FoodSummary) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function favoritesCollection(uid: string) {
  return collection(getFirebase().firestore, "users", uid, "favorites");
}

/** One live subscription to the user's favorites, shared by every heart button on the page. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [result, setResult] = useState<{ uid?: string; state: FavoritesState }>({ state: { status: "loading" } });

  useEffect(() => {
    if (!uid) return;
    const favoritesQuery = query(favoritesCollection(uid), orderBy("addedAt", "desc"), limit(maxFavorites));
    // Firestore reports local writes immediately, so hearts flip before the server confirms.
    // Pending timestamps are estimated so new favorites sort to the top right away.
    return onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const favorites = snapshot.docs
          .map((document) => parseFavorite(document.data({ serverTimestamps: "estimate" })))
          .filter((favorite): favorite is Favorite => favorite !== null);
        setResult({ uid, state: { status: "ready", favorites } });
      },
      () => setResult({ uid, state: { status: "error", error: new AppError("Couldn't load your favorites.") } }),
    );
  }, [uid]);

  // A result for a different user (after switching accounts) counts as still loading.
  const state = useMemo<FavoritesState>(
    () => (result.uid === uid ? result.state : loadingState),
    [result, uid],
  );

  const favoriteIds = useMemo(
    () => new Set(state.status === "ready" ? state.favorites.map((favorite) => favorite.food.fdcId) : []),
    [state],
  );

  const isFavorite = useCallback((fdcId: number) => favoriteIds.has(fdcId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (food: FoodSummary) => {
      if (!uid) return;
      const reference = doc(favoritesCollection(uid), String(food.fdcId));
      try {
        if (favoriteIds.has(food.fdcId)) {
          await deleteDoc(reference);
        } else {
          await setDoc(reference, { food: toFavoriteSnapshot(food), addedAt: serverTimestamp() });
        }
      } catch {
        throw new AppError("Couldn't update your favorites. Please try again.");
      }
    },
    [uid, favoriteIds],
  );

  const value = useMemo(() => ({ state, isFavorite, toggleFavorite }), [state, isFavorite, toggleFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside <FavoritesProvider>.");
  return context;
}
