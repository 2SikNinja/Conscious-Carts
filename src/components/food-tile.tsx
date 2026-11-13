import Link from "next/link";

import { brandLine, type FoodSummary } from "@/lib/api/schemas";

import { FavoriteButton } from "./favorite-button";
import { HealthScoreBadge } from "./health-score-badge";

export function FoodTile({ food }: { food: FoodSummary }) {
  const calories = food.energyKcal === undefined ? null : `${Math.round(food.energyKcal)} kcal / 100 g`;

  // The link stretches over the whole tile with ::after, so the favorite button
  // can sit on top of it without nesting a button inside a link.
  return (
    <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-surface py-3 pl-4 pr-2 transition focus-within:outline-2 focus-within:outline-primary hover:border-primary/50 hover:bg-surface-strong">
      <HealthScoreBadge healthScore={food.healthScore} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/food/${food.fdcId}`}
          className="line-clamp-2 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {food.description}
        </Link>
        <p className="mt-0.5 truncate text-sm text-muted">
          {[brandLine(food), calories].filter(Boolean).join("  ·  ")}
        </p>
      </div>
      <FavoriteButton food={food} className="relative z-10" />
    </div>
  );
}

export function FoodTileSkeleton() {
  return (
    <div aria-hidden className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
      <span className="size-11 animate-pulse rounded-xl bg-surface-strong" />
      <div className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-2/3 animate-pulse rounded bg-surface-strong" />
        <span className="h-3 w-1/3 animate-pulse rounded bg-surface-strong" />
      </div>
    </div>
  );
}
