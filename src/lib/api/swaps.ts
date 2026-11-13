import { z } from "zod";

import { lenientArray } from "./analysis";
import { callFunction } from "./client";
import { foodSummarySchema, type FoodSummary } from "./schemas";

/**
 * Schema for the `suggest_swaps` response. The backend asks Gemini for search
 * ideas, then only returns real USDA products that score higher than the
 * original and pass the user's allergen and avoid-list checks.
 */

const swapIdeaSchema = z.object({
  searchQuery: z.string().trim().min(1),
  reason: z.string().catch(""),
});
export type SwapIdea = z.infer<typeof swapIdeaSchema>;

const swapSchema = z.object({
  food: foodSummarySchema,
  reason: z.string().catch(""),
  searchQuery: z.string().catch(""),
});
export type Swap = z.infer<typeof swapSchema>;

export const swapsResultSchema = z.object({
  fdcId: z.number().int().positive(),
  baseScore: z.number().nullish().catch(null).transform((value) => value ?? null),
  swaps: lenientArray(swapSchema),
  ideas: lenientArray(swapIdeaSchema),
});
export type SwapsResult = z.infer<typeof swapsResultSchema>;

/** How many points a swap gains over the original, or null when either is unscored. */
export function scoreGain(baseScore: number | null, food: FoodSummary): number | null {
  const score = food.healthScore?.score;
  if (baseScore === null || score === undefined) return null;
  return score - baseScore;
}

/** Ideas that didn't already turn into a product, so they can be offered as searches. */
export function leftoverIdeas(result: SwapsResult): SwapIdea[] {
  const used = new Set(result.swaps.map((swap) => swap.searchQuery.toLowerCase()));
  const seen = new Set<string>();
  return result.ideas.filter((idea) => {
    const key = idea.searchQuery.toLowerCase();
    if (used.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function swapsQueryKey(fdcId: number) {
  return ["swaps", fdcId] as const;
}

/** Finds healthier products for this one. Counts against the daily AI limit on a cache miss. */
export function suggestSwaps(fdcId: number): Promise<SwapsResult> {
  return callFunction("suggest_swaps", { fdcId }, swapsResultSchema, { timeoutMs: 90_000 });
}
