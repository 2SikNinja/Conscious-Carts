import { describe, expect, it } from "vitest";

import { foodSchema, foodSummarySchema } from "./api/schemas";
import { parseFavorite, sortFavorites, summaryOf, toFavoriteSnapshot, type Favorite } from "./favorites";

const summary = foodSummarySchema.parse({
  fdcId: 42,
  description: "Rolled Oats",
  brandName: null,
  dataType: "Foundation",
  energyKcal: 375,
  healthScore: { score: 90, grade: "A", method: "food", breakdown: {} },
});

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe("toFavoriteSnapshot", () => {
  it("never includes undefined values, which Firestore rejects", () => {
    const snapshot = toFavoriteSnapshot(summary);
    expect(Object.values(snapshot)).not.toContain(undefined);
    expect(snapshot).toMatchObject({ fdcId: 42, description: "Rolled Oats", energyKcal: 375 });
    expect(snapshot).not.toHaveProperty("brandName");
  });

  it("round-trips through parseFavorite", () => {
    const favorite = parseFavorite({ food: toFavoriteSnapshot(summary), addedAt: timestamp("2026-01-01T00:00:00Z") });
    expect(favorite?.food).toEqual(summary);
    expect(favorite?.addedAt?.getUTCFullYear()).toBe(2026);
  });
});

describe("parseFavorite", () => {
  it("skips malformed documents and tolerates a missing timestamp", () => {
    expect(parseFavorite({ food: { description: "No id" } })).toBeNull();
    expect(parseFavorite(undefined)).toBeNull();
    expect(parseFavorite({ food: toFavoriteSnapshot(summary) })?.addedAt).toBeNull();
  });
});

describe("summaryOf", () => {
  it("takes calories from the per-100 g values", () => {
    const food = foodSchema.parse({ fdcId: 7, description: "Cola", per100g: { energyKcal: 39 }, healthScore: null });
    expect(summaryOf(food)).toMatchObject({ fdcId: 7, energyKcal: 39, healthScore: null });
  });
});

describe("sortFavorites", () => {
  const make = (id: number, name: string, score: number | null, iso: string | null): Favorite => ({
    food: { ...summary, fdcId: id, description: name, healthScore: score === null ? null : { score, grade: "C", method: "food", breakdown: {} } },
    addedAt: iso ? new Date(iso) : null,
  });
  const favorites = [
    make(1, "Banana chips", 40, "2026-01-02T00:00:00Z"),
    make(2, "Apple", 95, "2026-01-01T00:00:00Z"),
    make(3, "Cola", null, null),
  ];

  it.each([
    ["recent", [3, 1, 2]],
    ["healthiest", [2, 1, 3]],
    ["name", [2, 1, 3]],
  ] as const)("sorts by %s", (sort, expected) => {
    expect(sortFavorites(favorites, sort).map((favorite) => favorite.food.fdcId)).toEqual(expected);
  });
});
