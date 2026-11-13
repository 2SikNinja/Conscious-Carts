"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { HealthScoreBadge } from "@/components/health-score-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { getFoods } from "@/lib/api/foods";
import { brandLine, type Food, type HealthGrade } from "@/lib/api/schemas";
import { friendlyMessage } from "@/lib/auth/errors";
import {
  bestIndex,
  compareChartNutrients,
  compareHref,
  compareTableNutrients,
  compareWinner,
  maxCompareItems,
  parseCompareIds,
} from "@/lib/compare";
import { useCompare } from "@/lib/compare-context";
import { formatAmount, nutrientInfo, unitFor } from "@/lib/nutrition";

export function CompareView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const compare = useCompare();
  const urlIds = parseCompareIds(searchParams.get("ids"));
  const urlKey = urlIds.join(",");

  // The URL decides what's shown, so comparisons can be shared. With no ids in
  // the URL, show the tray; with ids, adopt them into the tray.
  useEffect(() => {
    if (urlIds.length === 0 && compare.ids.length > 0) {
      router.replace(compareHref(compare.ids), { scroll: false });
    } else if (urlIds.length > 0 && urlKey !== compare.ids.join(",")) {
      compare.replace(urlIds);
    }
    // Only re-run when the URL changes; the tray follows the URL, not the reverse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  const foods = useQuery({
    queryKey: ["compare", urlKey],
    queryFn: () => getFoods(urlIds),
    enabled: urlIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60 * 1000,
  });

  function removeProduct(fdcId: number) {
    const next = urlIds.filter((id) => id !== fdcId);
    compare.replace(next);
    router.replace(compareHref(next), { scroll: false });
  }

  function clearAll() {
    compare.clear();
    router.replace("/compare", { scroll: false });
  }

  return (
    // min-w-0 lets the wide table scroll inside its card instead of widening the page.
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Compare</h1>
        {urlIds.length > 0 ? (
          <div className="flex gap-2">
            <CopyLinkButton />
            <Button variant="ghost" onClick={clearAll}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      {urlIds.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold">Nothing to compare yet</h2>
          <p className="max-w-md text-muted">
            Tap the compare button on up to {maxCompareItems} products to see their nutrition side by side.
          </p>
          <ButtonLink href="/search">Find products</ButtonLink>
        </div>
      ) : foods.isPending ? (
        <div aria-hidden className="grid gap-4">
          <span className="h-24 animate-pulse rounded-2xl bg-surface" />
          <span className="h-96 animate-pulse rounded-2xl bg-surface" />
        </div>
      ) : foods.isError ? (
        <div role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted">{friendlyMessage(foods.error)}</p>
          <Button variant="secondary" onClick={() => void foods.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <CompareResults foods={foods.data} onRemove={removeProduct} />
      )}
    </div>
  );
}

function CompareResults({ foods, onRemove }: { foods: Food[]; onRemove: (fdcId: number) => void }) {
  const winner = compareWinner(foods);

  return (
    <>
      {foods.length === 1 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-muted">
          Add at least one more product to compare.{" "}
          <Link href="/search" className="font-semibold text-primary hover:underline">
            Search
          </Link>
        </p>
      ) : null}

      {winner ? (
        <section className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-5" aria-label="Healthiest pick">
          <HealthScoreBadge healthScore={winner.best.healthScore} size="lg" />
          <div>
            <p className="text-sm font-semibold text-primary">{winner.gap === 0 ? "It's a tie" : "Healthiest pick"}</p>
            <p className="text-lg">
              {winner.gap === 0 ? (
                <>
                  <strong>{winner.best.description}</strong> and <strong>{winner.runnerUp.description}</strong> have the
                  same health score.
                </>
              ) : (
                <>
                  <strong>{winner.best.description}</strong> scores {winner.gap} {winner.gap === 1 ? "point" : "points"}{" "}
                  higher than the next best.
                </>
              )}
            </p>
          </div>
        </section>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-5" aria-labelledby="table-heading">
        <h2 id="table-heading" className="mb-4 text-lg font-semibold">
          Side by side
        </h2>
        <CompareTable foods={foods} onRemove={onRemove} />
      </section>

      {foods.length > 1 ? (
        <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="chart-heading">
          <h2 id="chart-heading" className="mb-4 text-lg font-semibold">
            Chart
          </h2>
          <NutrientChart foods={foods} />
        </section>
      ) : null}
    </>
  );
}

function CompareTable({ foods, onRemove }: { foods: Food[]; onRemove: (fdcId: number) => void }) {
  const rows = compareTableNutrients.filter((key) => foods.some((food) => food.per100g[key] !== undefined));
  const scoreLeader = (() => {
    const scores = foods.map((food) => food.healthScore?.score);
    const present = scores.filter((score): score is number => score !== undefined);
    if (present.length < 2) return null;
    const top = Math.max(...present);
    return scores.filter((score) => score === top).length === 1 ? scores.indexOf(top) : null;
  })();

  const cell = (isBest: boolean) =>
    "px-3 py-2.5 text-right tabular-nums " + (isBest ? "rounded-lg bg-success/10 font-bold text-success" : "");

  return (
    <div className="relative -mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left">
        <caption className="sr-only">Nutrients per 100 g, with the healthiest value in each row highlighted</caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 align-bottom text-sm font-medium text-muted">
              Per 100 g
            </th>
            {foods.map((food) => (
              <th key={food.fdcId} scope="col" className="min-w-36 px-3 pb-3 align-bottom font-normal">
                <div className="flex items-start justify-between gap-2">
                  <HealthScoreBadge healthScore={food.healthScore} size="sm" />
                  <button
                    type="button"
                    onClick={() => onRemove(food.fdcId)}
                    aria-label={`Remove ${food.description}`}
                    className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-strong hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <Link href={`/food/${food.fdcId}`} className="mt-2 line-clamp-3 font-semibold hover:underline">
                  {food.description}
                </Link>
                <p className="truncate text-sm text-muted">{brandLine(food)}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <th scope="row" className="border-t border-border py-2.5 font-semibold">
              Health score
            </th>
            {foods.map((food, index) => (
              <td key={food.fdcId} className={`border-t border-border ${cell(index === scoreLeader)}`}>
                {food.healthScore ? `${food.healthScore.grade} · ${food.healthScore.score}` : "–"}
              </td>
            ))}
          </tr>
          {rows.map((key) => {
            const best = bestIndex(foods, key);
            return (
              <tr key={key}>
                <th scope="row" className="border-t border-border py-2.5 font-semibold">
                  {nutrientInfo(key)?.label ?? key}
                </th>
                {foods.map((food, index) => (
                  <td key={food.fdcId} className={`border-t border-border ${cell(index === best)}`}>
                    {formatAmount(food.per100g[key], unitFor(food, key))}
                    {index === best ? <span className="sr-only"> (best)</span> : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-muted">Green marks the healthiest value in each row. Drinks are per 100 ml.</p>
    </div>
  );
}

const barColors: Record<HealthGrade, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

function NutrientChart({ foods }: { foods: Food[] }) {
  const [key, setKey] = useState<(typeof compareChartNutrients)[number]>("totalSugars");
  const info = nutrientInfo(key);
  const values = foods.map((food) => food.per100g[key]);
  const max = Math.max(0, ...values.filter((value): value is number => value !== undefined));
  const direction = info?.better === "lower" ? "Lower is better" : info?.better === "higher" ? "Higher is better" : "";

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Nutrient to chart" className="flex flex-wrap gap-2">
        {compareChartNutrients.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={key === option}
            onClick={() => setKey(option)}
            className={
              "min-h-9 rounded-full border px-4 text-sm font-medium transition " +
              (key === option ? "border-primary bg-primary text-on-primary" : "border-border bg-background hover:bg-surface-strong")
            }
          >
            {nutrientInfo(option)?.label ?? option}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        {info?.label} per 100 g{direction ? `. ${direction}.` : "."}
      </p>

      {max === 0 ? (
        <p className="text-muted">None of these products list {info?.label.toLowerCase()}.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {foods.map((food, index) => {
            const value = values[index];
            const width = value === undefined ? 0 : Math.max(2, (value / max) * 100);
            const barColor = food.healthScore ? barColors[food.healthScore.grade] : "bg-muted";
            return (
              <li key={food.fdcId} className="grid gap-1.5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-3">
                <span className="truncate text-sm font-medium" title={food.description}>
                  {food.description}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-7 flex-1 rounded-lg bg-background">
                    <div
                      className={`h-full rounded-lg transition-[width] duration-500 ${barColor}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm tabular-nums">
                    {value === undefined ? "n/a" : formatAmount(value, unitFor(food, key))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button variant="secondary" onClick={copy}>
      {copied ? "Link copied" : "Copy link"}
    </Button>
  );
}
