import { foodSummarySchema, type Food, type FoodSummary } from "./api/schemas";

/**
 * Favorites store a small product snapshot so the list loads in one query,
 * without a backend call per item. Stored at users/{uid}/favorites/{fdcId}.
 */

export type Favorite = {
  food: FoodSummary;
  addedAt: Date | null;
};

export type FavoriteSort = "recent" | "healthiest" | "name";

export const favoriteSortLabels: Record<FavoriteSort, string> = {
  recent: "Recently saved",
  healthiest: "Healthiest first",
  name: "Name",
};

/** Builds the snapshot saved to Firestore. Firestore rejects undefined, so empty fields are left out. */
export function toFavoriteSnapshot(food: FoodSummary): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    fdcId: food.fdcId,
    description: food.description.slice(0, 300),
    healthScore: food.healthScore,
  };
  for (const key of ["brandName", "brandOwner", "dataType", "category", "upc", "energyKcal"] as const) {
    if (food[key] !== undefined) snapshot[key] = food[key];
  }
  return snapshot;
}

/** The summary of a full product, for saving it from its own page. */
export function summaryOf(food: Food): FoodSummary {
  return {
    fdcId: food.fdcId,
    description: food.description,
    brandName: food.brandName,
    brandOwner: food.brandOwner,
    dataType: food.dataType,
    category: food.category,
    upc: food.upc,
    energyKcal: food.per100g.energyKcal ?? food.energyKcal,
    healthScore: food.healthScore,
  };
}

/** Parses one stored favorite. Returns null for documents that don't look right. */
export function parseFavorite(data: { food?: unknown; addedAt?: unknown } | undefined): Favorite | null {
  const parsed = foodSummarySchema.safeParse(data?.food);
  if (!parsed.success) return null;
  const addedAt = data?.addedAt;
  const date =
    addedAt && typeof addedAt === "object" && "toDate" in addedAt && typeof addedAt.toDate === "function"
      ? (addedAt.toDate() as Date)
      : null;
  return { food: parsed.data, addedAt: date };
}

export function sortFavorites(favorites: Favorite[], sort: FavoriteSort): Favorite[] {
  const copy = [...favorites];
  switch (sort) {
    case "recent":
      // Unsaved local writes have no server time yet; keep them on top.
      return copy.sort((first, second) => (second.addedAt?.getTime() ?? Infinity) - (first.addedAt?.getTime() ?? Infinity));
    case "healthiest":
      return copy.sort((first, second) => (second.food.healthScore?.score ?? -1) - (first.food.healthScore?.score ?? -1));
    case "name":
      return copy.sort((first, second) => first.food.description.localeCompare(second.food.description));
  }
}
