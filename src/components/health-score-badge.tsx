import type { HealthGrade, HealthScore } from "@/lib/api/schemas";

const gradeClasses: Record<HealthGrade, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "size-8 rounded-lg text-base",
  md: "size-11 rounded-xl text-xl",
  lg: "size-14 rounded-2xl text-2xl",
};

/** An A to E tile. Shows a dash when there isn't enough data to grade. */
export function HealthScoreBadge({ healthScore, size = "md" }: { healthScore: HealthScore | null; size?: Size }) {
  const label = healthScore
    ? `Health grade ${healthScore.grade}, ${healthScore.score} out of 100`
    : "Not enough nutrition data to grade";

  return (
    <span
      role="img"
      aria-label={label}
      title={healthScore ? `Score ${healthScore.score}/100` : "Not enough data to grade"}
      className={
        "inline-flex shrink-0 items-center justify-center font-extrabold leading-none " +
        sizeClasses[size] +
        " " +
        (healthScore ? `${gradeClasses[healthScore.grade]} text-white` : "bg-surface-strong text-muted")
      }
    >
      {healthScore?.grade ?? "–"}
    </span>
  );
}
