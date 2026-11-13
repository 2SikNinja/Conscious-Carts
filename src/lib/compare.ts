import type { Food } from "./api/schemas";
import { nutrientInfo } from "./nutrition";

export const maxCompareItems = 4;

/** Nutrients in the side-by-side table, compared per 100 g or ml. */
export const compareTableNutrients = [
  "energyKcal",
  "totalFat",
  "saturatedFat",
  "sodium",
  "carbohydrates",
  "fiber",
  "totalSugars",
  "addedSugars",
  "protein",
] as const;

/** Nutrients the chart can switch between. */
export const compareChartNutrients = ["totalSugars", "sodium", "saturatedFat", "energyKcal", "protein", "fiber"] as const;

/** Parses `?ids=1,2,3` into valid, unique ids, keeping at most four. */
export function parseCompareIds(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids: number[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!/^\d{1,10}$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (id > 0 && !ids.includes(id)) ids.push(id);
    if (ids.length === maxCompareItems) break;
  }
  return ids;
}

export function compareHref(ids: readonly number[]): string {
  return ids.length > 0 ? `/compare?ids=${ids.join(",")}` : "/compare";
}

/**
 * Index of the healthiest value for a nutrient, or null when there is no
 * clear winner (fewer than two values, a neutral nutrient, or a tie).
 */
export function bestIndex(foods: readonly Food[], key: string): number | null {
  const better = nutrientInfo(key)?.better;
  if (!better || better === "neutral") return null;

  const values = foods.map((food) => food.per100g[key]);
  const present = values.filter((value): value is number => value !== undefined);
  if (present.length < 2) return null;

  const target = better === "lower" ? Math.min(...present) : Math.max(...present);
  const matches = values.flatMap((value, index) => (value === target ? [index] : []));
  return matches.length === 1 ? matches[0]! : null;
}

export type CompareWinner = { best: Food; runnerUp: Food; gap: number };

/** The highest-scoring product and how far ahead it is. Null with fewer than two scored products. */
export function compareWinner(foods: readonly Food[]): CompareWinner | null {
  const scored = foods
    .filter((food) => food.healthScore !== null)
    .sort((first, second) => second.healthScore!.score - first.healthScore!.score);
  if (scored.length < 2) return null;
  const [best, runnerUp] = scored as [Food, Food];
  return { best, runnerUp, gap: best.healthScore!.score - runnerUp.healthScore!.score };
}
