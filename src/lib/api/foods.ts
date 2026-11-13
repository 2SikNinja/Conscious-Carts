"use client";

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
