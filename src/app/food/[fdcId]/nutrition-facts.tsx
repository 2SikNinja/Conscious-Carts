"use client";

import { useState } from "react";

import type { Food } from "@/lib/api/schemas";
import {
  baseUnitLabel,
  dailyValuePercent,
  dailyValueTone,
  formatAmount,
  nutrientRows,
  servingLabel,
  unitFor,
} from "@/lib/nutrition";

type Basis = "serving" | "base";

export function NutritionFacts({ food }: { food: Food }) {
  const hasServing = Object.keys(food.perServing).length > 0;
  const [basis, setBasis] = useState<Basis>(hasServing ? "serving" : "base");

  const values = basis === "serving" ? food.perServing : food.per100g;
  const rows = nutrientRows.filter((row) => values[row.key] !== undefined);
  const showDailyValue = basis === "serving";

  return (
    <div className="flex flex-col gap-4">
      {hasServing ? (
        <div role="radiogroup" aria-label="Show nutrients" className="grid grid-cols-2 rounded-xl bg-background p-1">
          {(["serving", "base"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={basis === option}
              onClick={() => setBasis(option)}
              className={
                "min-h-10 truncate rounded-lg px-2 text-sm font-semibold transition " +
                (basis === option ? "bg-surface-strong shadow-sm" : "text-muted hover:text-foreground")
              }
            >
              {option === "serving" ? (servingLabel(food) ?? "Per serving") : `Per ${baseUnitLabel(food)}`}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium text-muted">Per {baseUnitLabel(food)}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-muted">USDA has no nutrient data for this product.</p>
      ) : (
        <table className="w-full text-left">
          <caption className="sr-only">
            Nutrition facts {basis === "serving" ? "per serving" : `per ${baseUnitLabel(food)}`}
          </caption>
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="pb-2 font-medium">
                Nutrient
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Amount
              </th>
              {showDailyValue ? (
                <th scope="col" className="w-16 pb-2 text-right font-medium">
                  <abbr title="Percent Daily Value">% DV</abbr>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const value = values[row.key]!;
              const percent = showDailyValue ? dailyValuePercent(row.key, value) : null;
              const tone = percent === null ? null : dailyValueTone(row.key, percent);
              return (
                <tr key={row.key} className="border-t border-border">
                  <th
                    scope="row"
                    className={`py-2.5 pr-3 ${row.indent ? "pl-4 font-normal text-muted" : "font-semibold"}`}
                  >
                    {row.label}
                  </th>
                  <td className="py-2.5 text-right tabular-nums">{formatAmount(value, unitFor(food, row.key))}</td>
                  {showDailyValue ? (
                    <td
                      className={
                        "py-2.5 text-right font-semibold tabular-nums " +
                        (tone === "bad" ? "text-danger" : tone === "good" ? "text-success" : "")
                      }
                    >
                      {percent === null ? "" : `${percent}%`}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showDailyValue && rows.length > 0 ? (
        <p className="text-sm text-muted">
          % Daily Value is based on a 2,000 calorie diet. 20% or more is high:{" "}
          <span className="text-danger">red</span> where less is better, <span className="text-success">green</span>{" "}
          where more is better.
        </p>
      ) : null}
    </div>
  );
}
