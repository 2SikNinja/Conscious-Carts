import type { Food, HealthGrade } from "@/lib/api/schemas";
import { baseUnitLabel, scoreFactors } from "@/lib/nutrition";

const grades: HealthGrade[] = ["A", "B", "C", "D", "E"];

const gradeBackground: Record<HealthGrade, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

const gradeText: Record<HealthGrade, string> = {
  A: "text-grade-a",
  B: "text-grade-b",
  C: "text-grade-c",
  D: "text-grade-d",
  E: "text-grade-e",
};

export function HealthScoreCard({ food }: { food: Food }) {
  const score = food.healthScore;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="score-heading">
      <h2 id="score-heading" className="mb-4 text-lg font-semibold">
        Health score
      </h2>

      {!score ? (
        <p className="text-muted">
          USDA is missing calories, sugar, saturated fat, or sodium for this product, so it can&apos;t be graded.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <ol className="flex items-center gap-1" aria-label={`Grade ${score.grade} on a scale from A to E`}>
              {grades.map((grade) => {
                const isActive = grade === score.grade;
                return (
                  <li
                    key={grade}
                    aria-current={isActive ? "true" : undefined}
                    className={
                      "flex items-center justify-center rounded-lg font-extrabold text-white transition " +
                      gradeBackground[grade] +
                      (isActive ? " size-11 text-xl" : " size-8 text-sm opacity-35")
                    }
                  >
                    {grade}
                  </li>
                );
              })}
            </ol>
            <p className="text-right">
              <span className={`text-4xl font-extrabold ${gradeText[score.grade]}`}>{score.score}</span>
              <span className="text-muted"> / 100</span>
            </p>
          </div>

          <ScoreFactors breakdown={score.breakdown} />

          <p className="mt-4 text-sm text-muted">
            Based on nutrients per {baseUnitLabel(food)}. A simplified score inspired by Nutri-Score, not the
            official one.
          </p>
        </>
      )}
    </section>
  );
}

function ScoreFactors({ breakdown }: { breakdown: Record<string, number> }) {
  const factors = scoreFactors(breakdown);
  if (factors.length === 0) return null;

  return (
    <ul className="mt-5 flex flex-wrap gap-2" aria-label="What affects the score">
      {factors.map((factor) => {
        const isPenalty = factor.effect === "penalty";
        return (
          <li
            key={factor.key}
            className={
              "rounded-full border px-3 py-1 text-sm font-medium " +
              (isPenalty ? "border-danger/40 bg-danger/10 text-danger" : "border-success/40 bg-success/10 text-success")
            }
          >
            <span aria-hidden>{isPenalty ? "↓ " : "↑ "}</span>
            {factor.label} {isPenalty ? "−" : "+"}
            {factor.points}
            <span className="sr-only"> points</span>
          </li>
        );
      })}
    </ul>
  );
}
