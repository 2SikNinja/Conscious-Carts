import Link from "next/link";

import { brandLine, type FoodSummary } from "@/lib/api/schemas";

import { HealthScoreBadge } from "./health-score-badge";

export function FoodTile({ food }: { food: FoodSummary }) {
  const calories = food.energyKcal === undefined ? null : `${Math.round(food.energyKcal)} kcal / 100 g`;

  return (
    <Link
      href={`/food/${food.fdcId}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/50 hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-primary"
    >
      <HealthScoreBadge healthScore={food.healthScore} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold">{food.description}</p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {[brandLine(food), calories].filter(Boolean).join("  ·  ")}
        </p>
      </div>
    </Link>
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
