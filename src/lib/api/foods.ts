"use client";

import { callFunction } from "./client";
import { searchPageSchema, type SearchFilter, type SearchPage } from "./schemas";

export const minQueryLength = 2;

export function searchFoods(query: string, page: number, filter: SearchFilter): Promise<SearchPage> {
  return callFunction("search_foods", { query, page, dataType: filter }, searchPageSchema);
}
