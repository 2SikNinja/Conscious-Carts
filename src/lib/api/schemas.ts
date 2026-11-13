import { z } from "zod";

/**
 * Schemas for what the Cloud Functions return. Parsing every response means a
 * backend change or a bad payload fails loudly here instead of deep in the UI.
 */

/** Optional text that may arrive as null, missing, or empty. Normalized to undefined. */
const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);

export const healthGradeSchema = z.enum(["A", "B", "C", "D", "E"]);
export type HealthGrade = z.infer<typeof healthGradeSchema>;

export const healthScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: healthGradeSchema,
  method: z.enum(["food", "beverage"]).catch("food"),
  breakdown: z.record(z.string(), z.number()).catch({}),
});
export type HealthScore = z.infer<typeof healthScoreSchema>;

export const foodSummarySchema = z.object({
  fdcId: z.number().int().positive(),
  description: z.string().min(1).catch("Unnamed food"),
  brandName: optionalText,
  brandOwner: optionalText,
  dataType: optionalText,
  category: optionalText,
  upc: optionalText,
  energyKcal: optionalNumber,
  // A missing score means "not enough data to grade", never a guess.
  healthScore: healthScoreSchema.nullish().catch(null).transform((value) => value ?? null),
});
export type FoodSummary = z.infer<typeof foodSummarySchema>;

export const searchPageSchema = z.object({
  foods: z.array(foodSummarySchema),
  totalHits: z.number().int().nonnegative().catch(0),
  pageNumber: z.number().int().positive().catch(1),
  totalPages: z.number().int().nonnegative().catch(1),
});
export type SearchPage = z.infer<typeof searchPageSchema>;

export const searchFilters = ["all", "branded", "generic"] as const;
export type SearchFilter = (typeof searchFilters)[number];

export function parseSearchFilter(value: string | null | undefined): SearchFilter {
  return searchFilters.includes(value as SearchFilter) ? (value as SearchFilter) : "all";
}

/** The label shown under a product name. */
export function brandLine(food: Pick<FoodSummary, "brandName" | "brandOwner" | "dataType">): string {
  return food.brandName ?? food.brandOwner ?? (food.dataType === "Branded" ? "Unknown brand" : "Whole food");
}
