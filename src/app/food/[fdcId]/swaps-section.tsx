"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { FoodTile } from "@/components/food-tile";
import { Button, Spinner } from "@/components/ui/button";
import { leftoverIdeas, scoreGain, suggestSwaps, swapsQueryKey, type Swap, type SwapIdea, type SwapsResult } from "@/lib/api/swaps";
import { friendlyMessage } from "@/lib/auth/errors";

/**
 * Healthier alternatives for a product. Finding swaps uses the AI quota, so it
 * only runs when asked, unless a result is already cached in this session.
 */
export function SwapsSection({ fdcId }: { fdcId: number }) {
  const queryClient = useQueryClient();
  const queryKey = swapsQueryKey(fdcId);
  const [isRequested, setIsRequested] = useState(() => queryClient.getQueryState(queryKey) !== undefined);

  const swaps = useQuery({
    queryKey,
    queryFn: () => suggestSwaps(fdcId),
    enabled: isRequested,
    // The backend caches swaps for a week, and saving the profile clears this query.
    staleTime: Infinity,
  });

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-5"
      aria-labelledby="swaps-heading"
      aria-busy={isRequested && swaps.isPending}
    >
      <h2 id="swaps-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <SwapIcon />
        Healthier swaps
      </h2>

      {!isRequested ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted">
            Find similar products that score higher and fit your allergies and avoid list.
          </p>
          <Button variant="secondary" onClick={() => setIsRequested(true)}>
            Find swaps
          </Button>
        </div>
      ) : swaps.isPending ? (
        <div className="flex items-center gap-3 py-6 text-muted" role="status">
          <Spinner className="size-5" />
          Searching for better options…
        </div>
      ) : swaps.isError ? (
        <div role="alert" className="mt-3 flex flex-col items-start gap-3">
          <p className="text-muted">{friendlyMessage(swaps.error)}</p>
          {(swaps.error as { code?: string }).code !== "resource-exhausted" ? (
            <Button variant="secondary" onClick={() => void swaps.refetch()}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : (
        <SwapsBody result={swaps.data} />
      )}
    </section>
  );
}

function SwapsBody({ result }: { result: SwapsResult }) {
  const ideas = leftoverIdeas(result);

  return (
    <div className="mt-3 flex flex-col gap-5">
      {result.swaps.length > 0 ? (
        <ul className="flex flex-col gap-4" aria-label="Suggested swaps">
          {result.swaps.map((swap) => (
            <SwapItem key={swap.food.fdcId} swap={swap} baseScore={result.baseScore} />
          ))}
        </ul>
      ) : (
        <p className="text-muted">
          No higher-scoring products matched your profile this time. Try one of these searches instead.
        </p>
      )}

      {ideas.length > 0 ? <IdeaLinks ideas={ideas} title={result.swaps.length > 0 ? "More ideas" : undefined} /> : null}

      <p className="text-xs text-muted">
        Ideas come from Gemini. Products and scores come from USDA data, so check the package before buying.
      </p>
    </div>
  );
}

function SwapItem({ swap, baseScore }: { swap: Swap; baseScore: number | null }) {
  const gain = scoreGain(baseScore, swap.food);
  return (
    <li className="flex flex-col gap-2">
      <FoodTile food={swap.food} />
      <p className="flex items-start gap-2 px-1 text-sm">
        {gain !== null && gain > 0 ? (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
            +{gain} {gain === 1 ? "point" : "points"}
          </span>
        ) : null}
        {swap.reason ? <span className="text-muted">{swap.reason}</span> : null}
      </p>
    </li>
  );
}

function IdeaLinks({ ideas, title }: { ideas: SwapIdea[]; title?: string }) {
  return (
    <div>
      {title ? <h3 className="mb-2 text-sm font-semibold">{title}</h3> : null}
      <ul className="flex flex-wrap gap-2" aria-label="Search ideas">
        {ideas.map((idea) => (
          <li key={idea.searchQuery}>
            <Link
              href={`/search?q=${encodeURIComponent(idea.searchQuery)}`}
              title={idea.reason || undefined}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium hover:border-primary/50 hover:bg-surface-strong"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              {idea.searchQuery}
              {idea.reason ? <span className="sr-only">. {idea.reason}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
    </svg>
  );
}
