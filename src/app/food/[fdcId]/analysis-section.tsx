"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Button, Spinner } from "@/components/ui/button";
import {
  analyzeFood,
  dietLabels,
  sortAlerts,
  type AnalysisResult,
  type DietCheck,
  type IngredientNote,
  type ProfileAlert,
  type Verdict,
} from "@/lib/api/analysis";
import { friendlyMessage } from "@/lib/auth/errors";

const verdictStyles: Record<Verdict, string> = {
  great: "bg-grade-a",
  good: "bg-grade-b",
  okay: "bg-grade-c",
  limit: "bg-grade-d",
  avoid: "bg-grade-e",
};

export function analysisQueryKey(fdcId: number) {
  return ["analysis", fdcId] as const;
}

export function AnalysisSection({ fdcId }: { fdcId: number }) {
  const queryClient = useQueryClient();
  const analysis = useQuery({
    queryKey: analysisQueryKey(fdcId),
    queryFn: () => analyzeFood(fdcId),
    // The backend caches analyses for 30 days, so there is no reason to refetch on its own.
    staleTime: Infinity,
  });

  const refresh = useMutation({
    mutationFn: () => analyzeFood(fdcId, true),
    onSuccess: (result) => queryClient.setQueryData(analysisQueryKey(fdcId), result),
  });

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="analysis-heading" aria-busy={analysis.isPending}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="analysis-heading" className="flex items-center gap-2 text-lg font-semibold">
          <SparkleIcon />
          AI analysis
        </h2>
        {analysis.isSuccess ? (
          <Button
            variant="ghost"
            className="min-h-9 px-3"
            onClick={() => refresh.mutate()}
            isLoading={refresh.isPending}
            title="Run the analysis again. This counts toward your daily AI limit."
          >
            {refresh.isPending ? "Refreshing" : "Refresh"}
          </Button>
        ) : null}
      </div>

      {refresh.isError ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          {friendlyMessage(refresh.error)}
        </p>
      ) : null}

      {analysis.isPending ? (
        <div className="flex items-center gap-3 py-6 text-muted" role="status">
          <Spinner className="size-5" />
          Reading the label and checking it against your profile…
        </div>
      ) : analysis.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-muted">{friendlyMessage(analysis.error)}</p>
          {(analysis.error as { code?: string }).code !== "resource-exhausted" ? (
            <Button variant="secondary" onClick={() => void analysis.refetch()}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : (
        <AnalysisBody result={analysis.data} />
      )}
    </section>
  );
}

function AnalysisBody({ result }: { result: AnalysisResult }) {
  const { analysis } = result;

  return (
    <div className="flex flex-col gap-5">
      {analysis.profileAlerts.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Alerts for your profile">
          {sortAlerts(analysis.profileAlerts).map((alert) => (
            <AlertItem key={alert.message} alert={alert} />
          ))}
        </ul>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white ${verdictStyles[analysis.verdict]}`}
        >
          {analysis.verdict}
        </span>
        <p className="text-sm">{analysis.verdictReason}</p>
      </div>

      <p className="leading-relaxed">{analysis.summary}</p>

      {analysis.allergens.length > 0 ? (
        <Group title="Allergens">
          <ul className="flex flex-wrap gap-2">
            {analysis.allergens.map((allergen) => (
              <li
                key={allergen}
                className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-sm font-medium text-warning"
              >
                {allergen}
              </li>
            ))}
          </ul>
        </Group>
      ) : null}

      {analysis.dietChecks.length > 0 ? (
        <Group title="Diet fit">
          <ul className="flex flex-wrap gap-2">
            {analysis.dietChecks.map((check) => (
              <DietChip key={check.diet} check={check} />
            ))}
          </ul>
        </Group>
      ) : null}

      {analysis.positives.length > 0 || analysis.negatives.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <PointList title="The good" points={analysis.positives} tone="good" />
          <PointList title="Watch out for" points={analysis.negatives} tone="bad" />
        </div>
      ) : null}

      {analysis.ingredientNotes.length > 0 ? (
        <Group title="Notable ingredients">
          <ul className="flex flex-col gap-2.5">
            {analysis.ingredientNotes.map((note) => (
              <IngredientRow key={note.name} note={note} />
            ))}
          </ul>
        </Group>
      ) : null}

      {analysis.tips.length > 0 ? (
        <Group title="Tips">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-primary">
            {analysis.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Group>
      ) : null}

      <p className="text-xs text-muted">
        Generated by Gemini from the USDA label data. AI can make mistakes, so check the package for allergens.
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function AlertItem({ alert }: { alert: ProfileAlert }) {
  const styles = {
    danger: "border-danger bg-danger/10",
    warning: "border-warning bg-warning/10",
    info: "border-primary bg-primary/10",
  }[alert.severity];
  const label = { danger: "Warning", warning: "Caution", info: "Note" }[alert.severity];

  return (
    <li className={`rounded-lg border-l-4 px-4 py-3 text-sm font-medium ${styles}`}>
      <span className="sr-only">{label}: </span>
      {alert.message}
    </li>
  );
}

function DietChip({ check }: { check: DietCheck }) {
  const styles = {
    yes: { icon: "✓", className: "border-success/40 text-success", label: "fits" },
    no: { icon: "✕", className: "border-danger/40 text-danger", label: "does not fit" },
    unclear: { icon: "?", className: "border-border text-muted", label: "unclear" },
  }[check.status];

  return (
    <li
      title={check.reason}
      className={`flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm font-medium ${styles.className}`}
    >
      <span aria-hidden className="font-bold">
        {styles.icon}
      </span>
      {dietLabels[check.diet]}
      <span className="sr-only">
        : {styles.label}. {check.reason}
      </span>
    </li>
  );
}

function PointList({ title, points, tone }: { title: string; points: string[]; tone: "good" | "bad" }) {
  return (
    <Group title={title}>
      {points.length === 0 ? (
        <p className="text-sm text-muted">Nothing notable.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {points.map((point) => (
            <li key={point} className="flex gap-2 text-sm">
              <span aria-hidden className={`font-bold ${tone === "good" ? "text-success" : "text-warning"}`}>
                {tone === "good" ? "+" : "−"}
              </span>
              {point}
            </li>
          ))}
        </ul>
      )}
    </Group>
  );
}

function IngredientRow({ note }: { note: IngredientNote }) {
  const dot = { high: "bg-grade-e", medium: "bg-grade-d", low: "bg-grade-c", none: "bg-grade-a" }[note.concern];
  return (
    <li className="flex gap-3 text-sm">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
      <p>
        <span className="font-semibold">{note.name}</span>
        <span className="sr-only"> ({note.concern} concern)</span>
        {note.note ? <span className="text-muted"> {note.note}</span> : null}
      </p>
    </li>
  );
}

function SparkleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-primary" fill="currentColor">
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5zm6.5 11l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </svg>
  );
}
