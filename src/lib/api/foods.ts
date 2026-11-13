"use client";

import { z } from "zod";

import { callFunction } from "./client";
import { foodSchema, searchPageSchema, type Food, type SearchFilter, type SearchPage } from "./schemas";

export const minQueryLength = 2;

export function searchFoods(query: string, page: number, filter: SearchFilter): Promise<SearchPage> {
  return callFunction("search_foods", { query, page, dataType: filter }, searchPageSchema);
}

export function getFood(fdcId: number): Promise<Food> {
  return callFunction("get_food", { fdcId }, foodSchema);
}

/** Parses a route segment into a USDA FoodData Central id, or null if it isn't one. */
export function parseFdcId(value: string | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const fdcId = Number(value);
  return fdcId > 0 ? fdcId : null;
}

const foodListSchema = z.object({ foods: z.array(foodSchema) });

/** Full details for up to four products, in the order requested. */
export async function getFoods(fdcIds: number[]): Promise<Food[]> {
  if (fdcIds.length === 0) return [];
  const { foods } = await callFunction("get_foods", { fdcIds }, foodListSchema);
  return foods;
}

const barcodeResultSchema = z.object({
  found: z.boolean(),
  food: foodSchema.nullish().transform((value) => value ?? null),
});
export type BarcodeResult = z.infer<typeof barcodeResultSchema>;

/** Finds the branded product with this barcode. `code` should already be normalized. */
export async function lookupBarcode(code: string): Promise<Food | null> {
  const result = await callFunction("lookup_barcode", { code }, barcodeResultSchema);
  return result.found ? result.food : null;
}
