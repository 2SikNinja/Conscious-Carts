"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FoodTile, FoodTileSkeleton } from "@/components/food-tile";
import { Button } from "@/components/ui/button";
import { minQueryLength, searchFoods } from "@/lib/api/foods";
import { parseSearchFilter, type SearchFilter } from "@/lib/api/schemas";
import { friendlyMessage } from "@/lib/auth/errors";

const exampleSearches = ["Greek yogurt", "Granola", "Oat milk", "Tortilla chips", "Peanut butter", "Frozen pizza"];

const filterLabels: Record<SearchFilter, string> = {
  all: "Everything",
  branded: "Brands",
  generic: "Whole foods",
};

const debounceMs = 400;

export function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = (searchParams.get("q") ?? "").trim();
  const filter = parseSearchFilter(searchParams.get("type"));

  // The input updates instantly; the URL (and the search) follow after a pause in typing.
  const [draft, setDraft] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    // The URL changed from outside the input (back button, example chip): mirror it.
    setSyncedQuery(query);
    setDraft(query);
  }

  function updateUrl(nextQuery: string, nextFilter: SearchFilter) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextFilter !== "all") params.set("type", nextFilter);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (draft.trim() === query) return;
    const timer = setTimeout(() => updateUrl(draft, filter), debounceMs);
    return () => clearTimeout(timer);
    // updateUrl only depends on values already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, query, filter]);

  const canSearch = query.length >= minQueryLength;

  const results = useInfiniteQuery({
    queryKey: ["search", query, filter],
    queryFn: ({ pageParam }) => searchFoods(query, pageParam, filter),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageNumber < lastPage.totalPages && lastPage.foods.length > 0 ? lastPage.pageNumber + 1 : undefined,
    enabled: canSearch,
  });

  // Keep only the first copy of each product; pages can overlap.
  const foods = [];
  const seenIds = new Set<number>();
  for (const page of results.data?.pages ?? []) {
    for (const food of page.foods) {
      if (!seenIds.has(food.fdcId)) {
        seenIds.add(food.fdcId);
        foods.push(food);
      }
    }
  }
  const totalHits = results.data?.pages[0]?.totalHits ?? 0;

  // Load the next page when the bottom of the list scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = results;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Search foods</h1>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateUrl(draft, filter);
        }}
      >
        <label htmlFor="search-input" className="sr-only">
          Search foods, brands, or ingredients
        </label>
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="search-input"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search foods, brands, or ingredients"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={100}
            className="min-h-13 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </form>

      <div role="radiogroup" aria-label="Filter results" className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as SearchFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={filter === option}
            onClick={() => updateUrl(draft, option)}
            className={
              "min-h-9 rounded-full border px-4 text-sm font-medium transition " +
              (filter === option
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface hover:bg-surface-strong")
            }
          >
            {filterLabels[option]}
          </button>
        ))}
      </div>

      {!canSearch ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-xl font-semibold">What are you shopping for?</h2>
          <p className="max-w-md text-muted">Search hundreds of thousands of USDA products by name, brand, or ingredient.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleSearches.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => updateUrl(example, filter)}
                className="min-h-9 rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-strong"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : results.isPending ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <FoodTileSkeleton />
            </li>
          ))}
        </ul>
      ) : results.isError && foods.length === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted">{friendlyMessage(results.error)}</p>
          <Button variant="secondary" onClick={() => void results.refetch()}>
            Try again
          </Button>
        </div>
      ) : foods.length === 0 ? (
        <div className="py-12 text-center">
          <h2 className="text-lg font-semibold">No matches for &ldquo;{query}&rdquo;</h2>
          <p className="mt-1 text-muted">Try a simpler word, or switch between Brands and Whole foods.</p>
        </div>
      ) : (
        <section aria-label="Results" className="flex flex-col gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {totalHits.toLocaleString()} {totalHits === 1 ? "result" : "results"}
          </p>
          <ul className="flex flex-col gap-2">
            {foods.map((food) => (
              <li key={food.fdcId}>
                <FoodTile food={food} />
              </li>
            ))}
          </ul>

          <div ref={sentinelRef} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <FoodTileSkeleton />
            ) : results.isFetchNextPageError ? (
              <Button variant="secondary" onClick={() => void fetchNextPage()}>
                Couldn&apos;t load more. Try again
              </Button>
            ) : hasNextPage ? (
              <Button variant="secondary" onClick={() => void fetchNextPage()}>
                Load more
              </Button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
