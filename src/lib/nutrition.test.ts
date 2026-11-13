import { describe, expect, it } from "vitest";

import { parseFdcId } from "./api/foods";
import { foodSchema } from "./api/schemas";
import {
  dailyValuePercent,
  dailyValueTone,
  formatAmount,
  scoreFactors,
  servingLabel,
  unitFor,
} from "./nutrition";

const colaFromBackend = {
  fdcId: 2345678,
  description: "Cola",
  brandName: "Fizz",
  brandOwner: "Some Beverage Co.",
  dataType: "Branded",
  category: "Soda",
  upc: "049000028911",
  ingredients: "Carbonated water, high fructose corn syrup, caramel color",
  servingSize: 355,
  servingUnit: "ml",
  servingText: "1 can",
  packageWeight: null,
  publicationDate: "2024-04-18",
  isBeverage: true,
  per100g: { energyKcal: 39, totalSugars: 10.6, sodium: 13 },
  perServing: { energyKcal: 140, totalSugars: 39, sodium: 45 },
  units: { energyKcal: "kcal", totalSugars: "g", sodium: "mg" },
  healthScore: { score: 22, grade: "E", method: "beverage", breakdown: { energy: 1, sugars: 8, fiber: 0 } },
};

describe("foodSchema", () => {
  it("parses the get_food response", () => {
    const food = foodSchema.parse(colaFromBackend);
    expect(food.perServing.totalSugars).toBe(39);
    expect(food.packageWeight).toBeUndefined();
    expect(food.isBeverage).toBe(true);
  });

  it("tolerates missing nutrient maps", () => {
    const food = foodSchema.parse({ ...colaFromBackend, per100g: null, perServing: undefined, units: null });
    expect(food.per100g).toEqual({});
    expect(food.perServing).toEqual({});
    expect(unitFor(food, "sodium")).toBe("mg");
  });
});

describe("formatting", () => {
  it("formats amounts like a label", () => {
    expect(formatAmount(140, "kcal")).toBe("140");
    expect(formatAmount(10.64, "g")).toBe("10.6 g");
    expect(formatAmount(355, "ml")).toBe("355 ml");
    expect(formatAmount(undefined, "g")).toBe("–");
  });

  it("builds a serving label from whatever is known", () => {
    expect(servingLabel({ servingText: "1 can", servingSize: 355, servingUnit: "ml" })).toBe("1 can (355 ml)");
    expect(servingLabel({ servingText: undefined, servingSize: 40, servingUnit: "g" })).toBe("40 g");
    expect(servingLabel({ servingText: undefined, servingSize: undefined, servingUnit: undefined })).toBeUndefined();
  });
});

describe("daily values", () => {
  it("computes %DV and leaves nutrients without one alone", () => {
    expect(dailyValuePercent("sodium", 460)).toBe(20);
    expect(dailyValuePercent("totalSugars", 39)).toBeNull();
  });

  it("flags 20% or more by whether more is better", () => {
    expect(dailyValueTone("sodium", 25)).toBe("bad");
    expect(dailyValueTone("fiber", 25)).toBe("good");
    expect(dailyValueTone("sodium", 10)).toBeNull();
    expect(dailyValueTone("carbohydrates", 40)).toBeNull();
  });
});

describe("scoreFactors", () => {
  it("lists penalties largest first, then bonuses, and skips zeros", () => {
    const factors = scoreFactors({ energy: 2, sugars: 8, fiber: -3, protein: -1, sodium: 0 });
    expect(factors.map((factor) => `${factor.effect}:${factor.key}:${factor.points}`)).toEqual([
      "penalty:sugars:8",
      "penalty:energy:2",
      "bonus:fiber:3",
      "bonus:protein:1",
    ]);
  });
});

describe("parseFdcId", () => {
  it.each([
    ["2345678", 2345678],
    ["0", null],
    ["-5", null],
    ["12abc", null],
    ["1e5", null],
    [undefined, null],
  ])("parses %s", (input, expected) => {
    expect(parseFdcId(input)).toBe(expected);
  });
});
