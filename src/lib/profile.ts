import { z } from "zod";

import { dietKeys, dietLabels } from "./api/analysis";

/**
 * The dietary profile that personalizes every analysis. These allowlists match
 * functions/dietary_profile.py, which re-validates the profile before it reaches
 * a prompt, and firestore.rules, which caps list sizes.
 */

export const allergenKeys = ["milk", "eggs", "fish", "shellfish", "treeNuts", "peanuts", "wheat", "soy", "sesame"] as const;
export type AllergenKey = (typeof allergenKeys)[number];

export const allergenLabels: Record<AllergenKey, string> = {
  milk: "Milk",
  eggs: "Eggs",
  fish: "Fish",
  shellfish: "Shellfish",
  treeNuts: "Tree nuts",
  peanuts: "Peanuts",
  wheat: "Wheat",
  soy: "Soy",
  sesame: "Sesame",
};

export { dietKeys, dietLabels };

export const goalKeys = [
  "loseWeight",
  "buildMuscle",
  "eatLessSugar",
  "eatLessSodium",
  "eatMoreFiber",
  "eatMoreProtein",
  "eatWholeFoods",
] as const;
export type GoalKey = (typeof goalKeys)[number];

export const goalLabels: Record<GoalKey, string> = {
  loseWeight: "Lose weight",
  buildMuscle: "Build muscle",
  eatLessSugar: "Eat less sugar",
  eatLessSodium: "Eat less sodium",
  eatMoreFiber: "Eat more fiber",
  eatMoreProtein: "Eat more protein",
  eatWholeFoods: "Eat more whole foods",
};

export const maxAvoidIngredients = 10;
export const maxAvoidIngredientLength = 40;

/** Keeps only allowed values, without duplicates, in a stable order. */
function allowlisted<const Values extends readonly string[]>(allowed: Values) {
  return z
    .array(z.unknown())
    .nullish()
    .catch([])
    .transform((values) => allowed.filter((key) => (values ?? []).includes(key)) as Values[number][]);
}

export const dietaryProfileSchema = z.object({
  allergens: allowlisted(allergenKeys),
  diets: allowlisted(dietKeys),
  goals: allowlisted(goalKeys),
  avoidIngredients: z
    .array(z.unknown())
    .nullish()
    .catch([])
    .transform((values) => {
      const cleaned: string[] = [];
      for (const value of values ?? []) {
        if (typeof value !== "string") continue;
        const item = normalizeAvoidIngredient(value);
        if (item && !cleaned.includes(item)) cleaned.push(item);
      }
      return cleaned.slice(0, maxAvoidIngredients);
    }),
});
export type DietaryProfile = z.infer<typeof dietaryProfileSchema>;

export const emptyProfile: DietaryProfile = { allergens: [], diets: [], goals: [], avoidIngredients: [] };

/** Reads whatever is stored in Firestore into a clean profile. Never throws. */
export function parseProfile(value: unknown): DietaryProfile {
  const parsed = dietaryProfileSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyProfile;
}

export function normalizeAvoidIngredient(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase().slice(0, maxAvoidIngredientLength);
}

export function isEmptyProfile(profile: DietaryProfile): boolean {
  return (
    profile.allergens.length === 0 &&
    profile.diets.length === 0 &&
    profile.goals.length === 0 &&
    profile.avoidIngredients.length === 0
  );
}

/** Order-insensitive comparison, used to tell whether there are unsaved changes. */
export function sameProfile(first: DietaryProfile, second: DietaryProfile): boolean {
  const sameItems = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((item) => b.includes(item));
  return (
    sameItems(first.allergens, second.allergens) &&
    sameItems(first.diets, second.diets) &&
    sameItems(first.goals, second.goals) &&
    sameItems(first.avoidIngredients, second.avoidIngredients)
  );
}

export function toggleItem<Item extends string>(items: readonly Item[], item: Item): Item[] {
  return items.includes(item) ? items.filter((existing) => existing !== item) : [...items, item];
}

export type AddIngredientResult = { profile: DietaryProfile; error?: string };

export function addAvoidIngredient(profile: DietaryProfile, rawValue: string): AddIngredientResult {
  const item = normalizeAvoidIngredient(rawValue);
  if (!item) return { profile };
  if (profile.avoidIngredients.includes(item)) return { profile, error: `"${item}" is already on your list.` };
  if (profile.avoidIngredients.length >= maxAvoidIngredients) {
    return { profile, error: `You can add up to ${maxAvoidIngredients} ingredients.` };
  }
  return { profile: { ...profile, avoidIngredients: [...profile.avoidIngredients, item] } };
}
