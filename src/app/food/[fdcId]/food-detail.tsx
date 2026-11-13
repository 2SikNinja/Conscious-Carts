"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, type ReactNode } from "react";

import { CompareButton } from "@/components/compare-button";
import { FavoriteButton } from "@/components/favorite-button";
import { Button } from "@/components/ui/button";
import { getFood, parseFdcId } from "@/lib/api/foods";
import { brandLine, type Food } from "@/lib/api/schemas";
import { friendlyMessage } from "@/lib/auth/errors";
import { summaryOf } from "@/lib/favorites";
import { servingLabel } from "@/lib/nutrition";

import { AnalysisSection } from "./analysis-section";
import { HealthScoreCard } from "./health-score-card";
import { NutritionFacts } from "./nutrition-facts";
import { SwapsSection } from "./swaps-section";

export function FoodDetail({ params }: { params: Promise<{ fdcId: string }> }) {
  const fdcId = parseFdcId(use(params).fdcId);

  const food = useQuery({
    queryKey: ["food", fdcId],
    queryFn: () => getFood(fdcId!),
    enabled: fdcId !== null,
    // Product data changes rarely; the backend also caches it for a week.
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (food.data) document.title = `${food.data.description} | Conscious Carts`;
  }, [food.data]);

  if (fdcId === null || (food.isError && (food.error as { code?: string }).code === "not-found")) {
    return (
      <Message title="Product not found" text="That product doesn't exist in the USDA database.">
        <Link href="/search" className="font-semibold text-primary hover:underline">
          Back to search
        </Link>
      </Message>
    );
  }
  if (food.isPending) return <FoodDetailSkeleton />;
  if (food.isError) {
    return (
      <Message title="Couldn't load this product" text={friendlyMessage(food.error)}>
        <Button variant="secondary" onClick={() => void food.refetch()}>
          Try again
        </Button>
      </Message>
    );
  }
  return <FoodContent food={food.data} />;
}

function FoodContent({ food }: { food: Food }) {
  const details = [
    food.category,
    servingLabel(food) ? `Serving: ${servingLabel(food)}` : undefined,
    food.packageWeight,
    food.upc ? `UPC ${food.upc}` : undefined,
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <article className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <div className="flex gap-2">
          <CompareButton fdcId={food.fdcId} name={food.description} variant="labeled" />
          <FavoriteButton food={summaryOf(food)} variant="labeled" />
        </div>
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">{brandLine(food)}</p>
        <h1 className="text-3xl font-bold leading-tight text-balance">{food.description}</h1>
        {details.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-2" aria-label="Product details">
            {details.map((detail) => (
              <li key={detail} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
                {detail}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <HealthScoreCard food={food} />
          <AnalysisSection fdcId={food.fdcId} />
          <SwapsSection fdcId={food.fdcId} />
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Nutrition facts">
            <NutritionFacts food={food} />
          </Section>
          <Section title="Ingredients">
            {food.ingredients ? (
              <p className="leading-relaxed">{food.ingredients}</p>
            ) : (
              <p className="text-muted">USDA doesn&apos;t list ingredients for this product.</p>
            )}
          </Section>
        </div>
      </div>

      <p className="text-sm text-muted">
        Data from USDA FoodData Central{food.publicationDate ? `, published ${food.publicationDate}` : ""}. Health
        scores are informational and can be wrong. Always check the package label.
      </p>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/search"))}
      className="-ml-2 flex min-h-10 w-fit items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-foreground"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function Message({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted">{text}</p>
      {children}
    </div>
  );
}

export function FoodDetailSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <span className="h-4 w-16 animate-pulse rounded bg-surface-strong" />
      <div className="flex flex-col gap-3">
        <span className="h-4 w-32 animate-pulse rounded bg-surface-strong" />
        <span className="h-8 w-2/3 animate-pulse rounded bg-surface-strong" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <span className="h-48 animate-pulse rounded-2xl bg-surface" />
        <span className="h-96 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
