/** Made-up products in the shape the Cloud Functions return. */

const units = {
  energyKcal: "kcal",
  totalFat: "g",
  saturatedFat: "g",
  transFat: "g",
  cholesterol: "mg",
  sodium: "mg",
  carbohydrates: "g",
  fiber: "g",
  totalSugars: "g",
  addedSugars: "g",
  protein: "g",
};

type Nutrients = Partial<Record<keyof typeof units, number>>;

function product(fdcId: number, description: string, brand: string, score: number, grade: string, per100g: Nutrients) {
  return {
    fdcId,
    description,
    brandName: brand,
    brandOwner: `${brand} Foods`,
    dataType: "Branded",
    category: "Cereal",
    upc: undefined as string | undefined,
    energyKcal: per100g.energyKcal,
    healthScore: { score, grade, method: "food", breakdown: { sugars: -5, fiber: 3 } },
    ingredients: "Whole grain oats, cane sugar, almonds, peanuts, salt.",
    servingSize: 55,
    servingUnit: "g",
    servingText: "2/3 cup",
    packageWeight: "12 oz",
    publicationDate: "2024-04-18",
    isBeverage: false,
    per100g,
    perServing: Object.fromEntries(Object.entries(per100g).map(([key, value]) => [key, Math.round(value * 0.55 * 10) / 10])),
    units,
  };
}

export const granola = {
  ...product(1001, "Honey Nut Granola Clusters", "Sunny Farms", 46, "C", {
    energyKcal: 436,
    totalFat: 16.4,
    saturatedFat: 1.8,
    sodium: 255,
    carbohydrates: 65.5,
    fiber: 5.5,
    totalSugars: 23.6,
    addedSugars: 21.8,
    protein: 9.1,
  }),
  upc: "036000291452",
};

export const muesli = product(1002, "Muesli with Seeds", "Alpine Table", 84, "A", {
  energyKcal: 370,
  totalFat: 7.2,
  saturatedFat: 0.9,
  sodium: 10,
  carbohydrates: 62,
  fiber: 9.8,
  totalSugars: 8.1,
  addedSugars: 0,
  protein: 11.4,
});

export const oatClusters = product(1003, "Unsweetened Oat Clusters", "Valley Mill", 78, "B", {
  energyKcal: 390,
  totalFat: 9,
  saturatedFat: 1.2,
  sodium: 40,
  carbohydrates: 66,
  fiber: 8,
  totalSugars: 3,
  addedSugars: 1,
  protein: 10,
});

export const allProducts = [granola, muesli, oatClusters];

export function summaryOf(food: (typeof allProducts)[number]) {
  const { fdcId, description, brandName, brandOwner, dataType, category, upc, energyKcal, healthScore } = food;
  return { fdcId, description, brandName, brandOwner, dataType, category, upc, energyKcal, healthScore };
}

export const analysis = {
  fdcId: granola.fdcId,
  profileApplied: false,
  analysis: {
    summary: "A crunchy granola built on whole grain oats, but sweetened heavily with cane sugar.",
    verdict: "limit",
    verdictReason: "Added sugar is high for a breakfast cereal.",
    allergens: ["peanuts", "tree nuts (almonds)"],
    ingredientNotes: [{ name: "Cane sugar", concern: "medium", note: "The second ingredient." }],
    positives: ["Whole grains are the main ingredient"],
    negatives: ["High in added sugar"],
    dietChecks: [{ diet: "vegan", status: "yes", reason: "No animal ingredients." }],
    profileAlerts: [{ severity: "warning", message: "Contains peanuts and tree nuts." }],
    tips: ["Use it as a topping instead of a full bowl."],
  },
};

export const swaps = {
  fdcId: granola.fdcId,
  baseScore: granola.healthScore.score,
  swaps: [
    { food: summaryOf(oatClusters), reason: "Same crunch with almost no added sugar.", searchQuery: "unsweetened granola" },
    { food: summaryOf(muesli), reason: "More fiber and no added sugar.", searchQuery: "muesli" },
  ],
  ideas: [
    { searchQuery: "unsweetened granola", reason: "" },
    { searchQuery: "muesli", reason: "" },
    { searchQuery: "plain rolled oats", reason: "The simplest way to cut sugar." },
  ],
};

export const aiLimitError = {
  status: "RESOURCE_EXHAUSTED",
  message: "You've reached today's AI limit. Create a free account for a higher limit.",
};
