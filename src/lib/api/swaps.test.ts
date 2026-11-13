import { describe, expect, it } from "vitest";

import { leftoverIdeas, scoreGain, swapsResultSchema } from "./swaps";

const hit = (fdcId: number, score: number | null) => ({
  fdcId,
  description: `Product ${fdcId}`,
  brandOwner: "Acme",
  energyKcal: 120,
  healthScore: score === null ? null : { score, grade: "B", method: "food", breakdown: {} },
});

const backendResult = {
  fdcId: 100,
  baseScore: 42,
  swaps: [
    { food: hit(201, 78), reason: "Less added sugar.", searchQuery: "plain greek yogurt" },
    { food: { description: "No id" }, reason: "Dropped.", searchQuery: "bad" },
  ],
  ideas: [
    { searchQuery: "plain greek yogurt", reason: "Less added sugar." },
    { searchQuery: "Skyr", reason: "More protein." },
    { searchQuery: "skyr", reason: "Duplicate." },
    { searchQuery: "", reason: "Blank queries are dropped." },
  ],
};

describe("swapsResultSchema", () => {
  it("parses swaps and drops malformed items", () => {
    const result = swapsResultSchema.parse(backendResult);
    expect(result.swaps).toHaveLength(1);
    expect(result.swaps[0].food.fdcId).toBe(201);
    expect(result.ideas).toHaveLength(3);
  });

  it("treats a missing base score as null", () => {
    const result = swapsResultSchema.parse({ ...backendResult, baseScore: undefined });
    expect(result.baseScore).toBeNull();
  });

  it("survives a response with no lists", () => {
    const result = swapsResultSchema.parse({ fdcId: 100, baseScore: 50 });
    expect(result.swaps).toEqual([]);
    expect(result.ideas).toEqual([]);
  });
});

describe("scoreGain", () => {
  it("returns the difference in points", () => {
    const { food } = swapsResultSchema.parse(backendResult).swaps[0];
    expect(scoreGain(42, food)).toBe(36);
  });

  it("returns null when either side is unscored", () => {
    const { food } = swapsResultSchema.parse(backendResult).swaps[0];
    expect(scoreGain(null, food)).toBeNull();
    const unscored = swapsResultSchema.parse({ fdcId: 1, swaps: [{ food: hit(3, null) }] }).swaps[0].food;
    expect(scoreGain(42, unscored)).toBeNull();
  });
});

describe("leftoverIdeas", () => {
  it("skips ideas that became swaps and repeated queries", () => {
    const ideas = leftoverIdeas(swapsResultSchema.parse(backendResult));
    expect(ideas.map((idea) => idea.searchQuery)).toEqual(["Skyr"]);
  });
});
