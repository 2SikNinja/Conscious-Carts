import { z } from "zod";

import { callFunction } from "./client";

/**
 * Schemas for the `analyze_food` response. The backend asks Gemini for this exact
 * shape with structured output, then validates it with Pydantic. Validating again
 * here keeps the UI safe if either side changes.
 */

const shortList = z.array(z.string().trim().min(1)).catch([]);

export const dietKeys = [
  "vegan",
  "vegetarian",
  "pescatarian",
  "glutenFree",
  "dairyFree",
  "keto",
  "lowCarb",
  "lowSodium",
  "lowSugar",
  "diabeticFriendly",
  "heartHealthy",
  "halal",
  "kosher",
] as const;
export type DietKey = (typeof dietKeys)[number];

export const dietLabels: Record<DietKey, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  glutenFree: "Gluten-free",
  dairyFree: "Dairy-free",
  keto: "Keto",
  lowCarb: "Low carb",
  lowSodium: "Low sodium",
  lowSugar: "Low sugar",
  diabeticFriendly: "Diabetic-friendly",
  heartHealthy: "Heart healthy",
  halal: "Halal",
  kosher: "Kosher",
};

export const verdicts = ["great", "good", "okay", "limit", "avoid"] as const;
export type Verdict = (typeof verdicts)[number];

const ingredientNoteSchema = z.object({
  name: z.string().trim().min(1),
  concern: z.enum(["none", "low", "medium", "high"]).catch("none"),
  note: z.string().catch(""),
});

const dietCheckSchema = z.object({
  diet: z.enum(dietKeys),
  status: z.enum(["yes", "no", "unclear"]).catch("unclear"),
  reason: z.string().catch(""),
});

const profileAlertSchema = z.object({
  severity: z.enum(["info", "warning", "danger"]).catch("info"),
  message: z.string().trim().min(1),
});

/** Drops individual bad items instead of failing the whole list. */
export function lenientArray<Item extends z.ZodType>(item: Item) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((values) =>
      values.flatMap((value) => {
        const parsed = item.safeParse(value);
        return parsed.success ? [parsed.data as z.infer<Item>] : [];
      }),
    );
}

export const foodAnalysisSchema = z.object({
  summary: z.string().trim().min(1),
  // An unknown verdict is shown as neutral rather than as a false "great".
  verdict: z.enum(verdicts).catch("okay"),
  verdictReason: z.string().catch(""),
  allergens: shortList,
  ingredientNotes: lenientArray(ingredientNoteSchema),
  positives: shortList,
  negatives: shortList,
  dietChecks: lenientArray(dietCheckSchema),
  profileAlerts: lenientArray(profileAlertSchema),
  tips: shortList,
});
export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;
export type ProfileAlert = FoodAnalysis["profileAlerts"][number];
export type DietCheck = FoodAnalysis["dietChecks"][number];
export type IngredientNote = FoodAnalysis["ingredientNotes"][number];

export const analysisResultSchema = z.object({
  fdcId: z.number().int().positive(),
  analysis: foodAnalysisSchema,
  profileApplied: z.boolean().catch(false),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/** Most serious alerts first, so allergen warnings are never buried. */
export function sortAlerts(alerts: ProfileAlert[]): ProfileAlert[] {
  const rank = { danger: 0, warning: 1, info: 2 } as const;
  return [...alerts].sort((first, second) => rank[first.severity] - rank[second.severity]);
}

/**
 * Runs (or returns the cached) AI analysis for a product. `refresh` skips the
 * backend cache and counts against the daily AI limit.
 */
export function analyzeFood(fdcId: number, refresh = false): Promise<AnalysisResult> {
  return callFunction("analyze_food", { fdcId, refresh }, analysisResultSchema, { timeoutMs: 90_000 });
}
