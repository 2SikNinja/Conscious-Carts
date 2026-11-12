import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { toApiError } from "./client";
import { brandLine, foodSummarySchema, parseSearchFilter, searchPageSchema } from "./schemas";

const backendHit = {
  fdcId: 2345678,
  description: "Cola",
  brandName: "Fizz",
  brandOwner: null,
  dataType: "Branded",
  category: "Soda",
  upc: "049000028911",
  energyKcal: 39,
  healthScore: { score: 22, grade: "E", method: "beverage", breakdown: { sugars: 8 } },
};

describe("foodSummarySchema", () => {
  it("parses a search hit from the backend", () => {
    const food = foodSummarySchema.parse(backendHit);
    expect(food.healthScore?.grade).toBe("E");
    expect(food.brandOwner).toBeUndefined();
  });

  it("treats a missing or malformed score as unscored", () => {
    expect(foodSummarySchema.parse({ ...backendHit, healthScore: null }).healthScore).toBeNull();
    expect(foodSummarySchema.parse({ ...backendHit, healthScore: { grade: "Z" } }).healthScore).toBeNull();
  });

  it("normalizes blank text to undefined", () => {
    expect(foodSummarySchema.parse({ ...backendHit, brandName: "  " }).brandName).toBeUndefined();
  });

  it("rejects hits without a valid id", () => {
    expect(foodSummarySchema.safeParse({ ...backendHit, fdcId: "abc" }).success).toBe(false);
  });
});

describe("searchPageSchema", () => {
  it("fills safe defaults for paging fields", () => {
    const page = searchPageSchema.parse({ foods: [backendHit], totalHits: null });
    expect(page.totalHits).toBe(0);
    expect(page.pageNumber).toBe(1);
  });
});

describe("helpers", () => {
  it("falls back to a sensible brand line", () => {
    expect(brandLine({ brandName: undefined, brandOwner: "Acme", dataType: "Branded" })).toBe("Acme");
    expect(brandLine({ brandName: undefined, brandOwner: undefined, dataType: "Foundation" })).toBe("Whole food");
  });

  it("only accepts known filters", () => {
    expect(parseSearchFilter("generic")).toBe("generic");
    expect(parseSearchFilter("drop table")).toBe("all");
    expect(parseSearchFilter(null)).toBe("all");
  });
});

describe("toApiError", () => {
  it("shows backend messages for user-facing codes", () => {
    const error = toApiError(new FirebaseError("functions/resource-exhausted", "You've reached today's AI limit."));
    expect(error.message).toBe("You've reached today's AI limit.");
    expect(error.code).toBe("resource-exhausted");
  });

  it("strips the HTTP status the SDK appends", () => {
    const error = toApiError(new FirebaseError("functions/unavailable", "The food database is busy. [503]"));
    expect(error.message).toBe("The food database is busy.");
  });

  it("hides internal error details", () => {
    const error = toApiError(new FirebaseError("functions/internal", "Traceback: KeyError"));
    expect(error.message).toBe("Something went wrong. Please try again.");
  });
});
