"use client";

import { useState } from "react";

import { FoodTile, FoodTileSkeleton } from "@/components/food-tile";
import { ButtonLink } from "@/components/ui/button";
import { favoriteSortLabels, sortFavorites, type FavoriteSort } from "@/lib/favorites";
import { useFavorites } from "@/lib/firestore/favorites";

export function FavoritesView() {
  const { state } = useFavorites();
  const [sort, setSort] = useState<FavoriteSort>("recent");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Favorites</h1>
        {state.status === "ready" && state.favorites.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as FavoriteSort)}
              className="min-h-10 rounded-xl border border-border bg-surface px-3 text-foreground outline-none focus:border-primary"
            >
              {(Object.keys(favoriteSortLabels) as FavoriteSort[]).map((option) => (
                <option key={option} value={option}>
                  {favoriteSortLabels[option]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading favorites">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <FoodTileSkeleton />
            </li>
          ))}
        </ul>
      ) : state.status === "error" ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
          {state.error.message}
        </p>
      ) : state.favorites.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold">No favorites yet</h2>
          <p className="max-w-sm text-muted">Tap the heart on any product to keep it here for your next shopping trip.</p>
          <ButtonLink href="/search">Find products</ButtonLink>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted" aria-live="polite">
            {state.favorites.length} saved {state.favorites.length === 1 ? "product" : "products"}
          </p>
          <ul className="flex flex-col gap-2">
            {sortFavorites(state.favorites, sort).map((favorite) => (
              <li key={favorite.food.fdcId}>
                <FoodTile food={favorite.food} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
