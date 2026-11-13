import type { Food } from "./api/schemas";

/** Whether less or more of a nutrient is the healthier direction. */
export type Better = "lower" | "higher" | "neutral";

export type NutrientInfo = {
  key: string;
  label: string;
  /** FDA reference daily value for adults, in the nutrient's unit. Null when none applies. */
  dailyValue: number | null;
  better: Better;
  /** Shown indented under its parent row, like on a US label. */
  indent?: boolean;
};

/** Rows in US Nutrition Facts order. */
export const nutrientRows: NutrientInfo[] = [
  { key: "energyKcal", label: "Calories", dailyValue: 2000, better: "lower" },
  { key: "totalFat", label: "Total fat", dailyValue: 78, better: "lower" },
  { key: "saturatedFat", label: "Saturated fat", dailyValue: 20, better: "lower", indent: true },
  { key: "transFat", label: "Trans fat", dailyValue: null, better: "lower", indent: true },
  { key: "cholesterol", label: "Cholesterol", dailyValue: 300, better: "lower" },
  { key: "sodium", label: "Sodium", dailyValue: 2300, better: "lower" },
  { key: "carbohydrates", label: "Total carbohydrates", dailyValue: 275, better: "neutral" },
  { key: "fiber", label: "Dietary fiber", dailyValue: 28, better: "higher", indent: true },
  { key: "totalSugars", label: "Total sugars", dailyValue: null, better: "lower", indent: true },
  { key: "addedSugars", label: "Added sugars", dailyValue: 50, better: "lower", indent: true },
  { key: "protein", label: "Protein", dailyValue: 50, better: "higher" },
  { key: "vitaminD", label: "Vitamin D", dailyValue: 20, better: "higher" },
  { key: "calcium", label: "Calcium", dailyValue: 1300, better: "higher" },
  { key: "iron", label: "Iron", dailyValue: 18, better: "higher" },
  { key: "potassium", label: "Potassium", dailyValue: 4700, better: "higher" },
  { key: "vitaminC", label: "Vitamin C", dailyValue: 90, better: "higher" },
];

export const defaultUnits: Record<string, string> = {
  energyKcal: "kcal",
  protein: "g",
  totalFat: "g",
  saturatedFat: "g",
  transFat: "g",
  cholesterol: "mg",
  carbohydrates: "g",
  fiber: "g",
  totalSugars: "g",
  addedSugars: "g",
  sodium: "mg",
  potassium: "mg",
  calcium: "mg",
  iron: "mg",
  vitaminD: "mcg",
  vitaminC: "mg",
};

export function nutrientInfo(key: string): NutrientInfo | undefined {
  return nutrientRows.find((row) => row.key === key);
}

export function unitFor(food: Pick<Food, "units">, key: string): string {
  return food.units[key] ?? defaultUnits[key] ?? "";
}

/** Formats an amount like a label: whole numbers when large or exact, one decimal otherwise. */
export function formatAmount(value: number | undefined, unit: string): string {
  if (value === undefined) return "–";
  const text = value >= 100 || Number.isInteger(value) ? String(Math.round(value)) : value.toFixed(1);
  return unit === "kcal" || unit === "" ? text : `${text} ${unit}`;
}

/** Percent of the daily value, or null when the nutrient has no daily value. */
export function dailyValuePercent(key: string, value: number): number | null {
  const dailyValue = nutrientInfo(key)?.dailyValue;
  if (!dailyValue) return null;
  return Math.round((value / dailyValue) * 100);
}

/**
 * How notable a %DV is, following the FDA rule of thumb:
 * 5% or less is low, 20% or more is high.
 */
export function dailyValueTone(key: string, percent: number): "good" | "bad" | null {
  const better = nutrientInfo(key)?.better;
  if (percent < 20 || !better || better === "neutral") return null;
  return better === "higher" ? "good" : "bad";
}

/** "1 can (355 ml)" style serving text, or undefined when unknown. */
export function servingLabel(food: Pick<Food, "servingText" | "servingSize" | "servingUnit">): string | undefined {
  const size =
    food.servingSize !== undefined && food.servingUnit ? formatAmount(food.servingSize, food.servingUnit) : undefined;
  if (food.servingText && size) return `${food.servingText} (${size})`;
  return food.servingText ?? size;
}

export function baseUnitLabel(food: Pick<Food, "isBeverage">): string {
  return food.isBeverage ? "100 ml" : "100 g";
}

const breakdownLabels: Record<string, string> = {
  energy: "Calories",
  sugars: "Sugars",
  saturatedFat: "Saturated fat",
  sodium: "Sodium",
  fiber: "Fiber",
  protein: "Protein",
};

export type ScoreFactor = { key: string; label: string; points: number; effect: "penalty" | "bonus" };

/**
 * Explains a health score: what pulled it down (penalties, largest first)
 * and what pushed it up (bonuses). Zero-point factors are left out.
 */
export function scoreFactors(breakdown: Record<string, number>): ScoreFactor[] {
  const factors = Object.entries(breakdown)
    .filter(([, points]) => points !== 0)
    .map(([key, points]): ScoreFactor => ({
      key,
      label: breakdownLabels[key] ?? key,
      points: Math.abs(points),
      effect: points > 0 ? "penalty" : "bonus",
    }));
  return [
    ...factors.filter((factor) => factor.effect === "penalty").sort((first, second) => second.points - first.points),
    ...factors.filter((factor) => factor.effect === "bonus").sort((first, second) => second.points - first.points),
  ];
}
