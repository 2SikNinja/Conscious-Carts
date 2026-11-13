import { describe, expect, it } from "vitest";

import { foodSchema, type Food } from "./api/schemas";
import { bestIndex, compareHref, compareWinner, parseCompareIds } from "./compare";

function food(fdcId: number, per100g: Record<string, number>, score: number | null): Food {
  return foodSchema.parse({
    fdcId,
    description: `Food ${fdcId}`,
    per100g,
    healthScore: score === null ? null : { score, grade: "C", method: "food", breakdown: {} },
  });
}

describe("parseCompareIds", () => {
  it("keeps valid unique ids, at most four", () => {
    expect(parseCompareIds("5, 3,5,abc,-1,0,1e3,7,8,9")).toEqual([5, 3, 7, 8]);
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
  });

  it("round-trips through compareHref", () => {
    expect(compareHref([1, 2])).toBe("/compare?ids=1,2");
    expect(parseCompareIds(compareHref([1, 2]).split("=")[1])).toEqual([1, 2]);
    expect(compareHref([])).toBe("/compare");
  });
});

describe("bestIndex", () => {
  const foods = [food(1, { sodium: 300, fiber: 2 }, 50), food(2, { sodium: 120, fiber: 6 }, 70), food(3, { fiber: 6 }, null)];

  it("picks the lowest value where less is better", () => {
    expect(bestIndex(foods, "sodium")).toBe(1);
  });

  it("returns null on ties, neutral nutrients, or too few values", () => {
    expect(bestIndex(foods, "fiber")).toBeNull();
    expect(bestIndex(foods, "carbohydrates")).toBeNull();
    expect(bestIndex([foods[0]!], "sodium")).toBeNull();
  });
});

describe("compareWinner", () => {
  it("finds the top score and the gap to the runner-up, ignoring unscored products", () => {
    const winner = compareWinner([food(1, {}, 40), food(2, {}, null), food(3, {}, 72), food(4, {}, 65)]);
    expect(winner?.best.fdcId).toBe(3);
    expect(winner?.runnerUp.fdcId).toBe(4);
    expect(winner?.gap).toBe(7);
  });

  it("needs at least two scored products", () => {
    expect(compareWinner([food(1, {}, 40), food(2, {}, null)])).toBeNull();
  });
});
