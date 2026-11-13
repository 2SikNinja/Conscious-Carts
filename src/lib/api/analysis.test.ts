import { describe, expect, it } from "vitest";

import { analysisResultSchema, sortAlerts } from "./analysis";

const backendResult = {
  fdcId: 2345678,
  profileApplied: true,
  analysis: {
    summary: "A sweet granola with whole grains and nuts.",
    verdict: "avoid",
    verdictReason: "It contains something on your avoid list.",
    allergens: ["tree nuts", "peanuts"],
    ingredientNotes: [
      { name: "Cane sugar", concern: "medium", note: "Second ingredient, so sugar is high." },
      { name: "", concern: "low", note: "Blank names are dropped." },
    ],
    positives: ["Whole grain oats"],
    negatives: ["24% of the daily added sugar limit per serving"],
    dietChecks: [
      { diet: "vegan", status: "no", reason: "Contains honey." },
      { diet: "carnivore", status: "yes", reason: "Unknown diets are dropped." },
    ],
    profileAlerts: [
      { severity: "info", message: "Moderate sodium." },
      { severity: "danger", message: "Contains peanuts, which is on your avoid list." },
    ],
    tips: ["Use it as a topping instead of a full bowl."],
  },
};

describe("analysisResultSchema", () => {
  it("parses a full analysis", () => {
    const result = analysisResultSchema.parse(backendResult);
    expect(result.analysis.verdict).toBe("avoid");
    expect(result.analysis.allergens).toEqual(["tree nuts", "peanuts"]);
  });

  it("drops bad list items without failing the whole response", () => {
    const { analysis } = analysisResultSchema.parse(backendResult);
    expect(analysis.ingredientNotes).toHaveLength(1);
    expect(analysis.dietChecks.map((check) => check.diet)).toEqual(["vegan"]);
  });

  it("shows an unknown verdict as neutral", () => {
    const result = analysisResultSchema.parse({
      ...backendResult,
      analysis: { ...backendResult.analysis, verdict: "amazing" },
    });
    expect(result.analysis.verdict).toBe("okay");
  });

  it("defaults missing lists to empty", () => {
    const result = analysisResultSchema.parse({
      fdcId: 1,
      analysis: { summary: "Fine.", verdict: "good" },
    });
    expect(result.analysis.tips).toEqual([]);
    expect(result.analysis.profileAlerts).toEqual([]);
    expect(result.profileApplied).toBe(false);
  });

  it("rejects an analysis without a summary", () => {
    expect(analysisResultSchema.safeParse({ fdcId: 1, analysis: { verdict: "good" } }).success).toBe(false);
  });
});

describe("sortAlerts", () => {
  it("puts danger first", () => {
    const { analysis } = analysisResultSchema.parse(backendResult);
    expect(sortAlerts(analysis.profileAlerts).map((alert) => alert.severity)).toEqual(["danger", "info"]);
  });
});
