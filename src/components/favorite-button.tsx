"use client";

import { useState } from "react";

import type { FoodSummary } from "@/lib/api/schemas";
import { friendlyMessage } from "@/lib/auth/errors";
import { useFavorites } from "@/lib/firestore/favorites";

type FavoriteButtonProps = {
  food: FoodSummary;
  /** "icon" for list rows, "labeled" for the product page. */
  variant?: "icon" | "labeled";
  className?: string;
};

export function FavoriteButton({ food, variant = "icon", className = "" }: FavoriteButtonProps) {
  const { state, isFavorite, toggleFavorite } = useFavorites();
  const [error, setError] = useState<string | null>(null);
  const isSaved = isFavorite(food.fdcId);
  const label = isSaved ? `Remove ${food.description} from favorites` : `Save ${food.description} to favorites`;

  async function handleClick() {
    setError(null);
    try {
      await toggleFavorite(food);
    } catch (toggleError) {
      setError(friendlyMessage(toggleError));
    }
  }

  return (
    <span className={`relative inline-flex flex-col items-end ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state.status !== "ready"}
        aria-pressed={isSaved}
        aria-label={variant === "icon" ? label : undefined}
        title={label}
        className={
          "inline-flex items-center justify-center gap-2 rounded-xl transition disabled:opacity-50 " +
          (variant === "icon"
            ? "size-11 text-muted hover:bg-surface-strong hover:text-danger"
            : "min-h-11 border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-strong")
        }
      >
        <HeartIcon filled={isSaved} />
        {variant === "labeled" ? (isSaved ? "Saved" : "Save") : null}
      </button>
      {error ? (
        <span role="alert" className="absolute top-full mt-1 w-max max-w-56 rounded-lg bg-danger px-2 py-1 text-xs text-white">
          {error}
        </span>
      ) : null}
    </span>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`size-5 ${filled ? "text-danger" : ""}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.9 4.5c2.1 0 3.7 1.2 5.1 3 1.4-1.8 3-3 5.1-3 3.6 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
      />
    </svg>
  );
}
