import { granola } from "./data";
import { continueAsGuest, expect, test } from "./fixtures";

test("shows the health score, nutrition, and AI analysis", async ({ page }) => {
  await continueAsGuest(page, `/food/${granola.fdcId}`);

  await expect(page.getByRole("heading", { name: granola.description, level: 1 })).toBeVisible();
  await expect(page.getByText("46", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nutrition facts" })).toBeVisible();
  await expect(page.getByText("Contains peanuts and tree nuts.")).toBeVisible();
  await expect(page.getByText("Added sugar is high for a breakfast cereal.")).toBeVisible();
  await expect(page).toHaveTitle(`${granola.description} | Conscious Carts`);
});

test("finds healthier swaps only when asked", async ({ page, backend }) => {
  await continueAsGuest(page, `/food/${granola.fdcId}`);
  await expect(page.getByRole("button", { name: "Find swaps" })).toBeVisible();
  expect(backend.callsTo("suggest_swaps")).toHaveLength(0);

  await page.getByRole("button", { name: "Find swaps" }).click();
  const swaps = page.getByRole("list", { name: "Suggested swaps" });
  await expect(swaps.getByRole("link", { name: "Unsweetened Oat Clusters" })).toBeVisible();
  await expect(page.getByText("+32 points")).toBeVisible();
  await expect(page.getByText("+38 points")).toBeVisible();
  await expect(page.getByRole("list", { name: "Search ideas" }).getByRole("link")).toHaveAttribute(
    "href",
    "/search?q=plain%20rolled%20oats",
  );
  expect(backend.callsTo("suggest_swaps")).toEqual([{ fdcId: granola.fdcId }]);
});

test("explains the daily AI limit without offering a pointless retry", async ({ page, backend }) => {
  backend.failWithAiLimit("suggest_swaps");
  await continueAsGuest(page, `/food/${granola.fdcId}`);
  await page.getByRole("button", { name: "Find swaps" }).click();

  const swapsCard = page.getByRole("region", { name: "Healthier swaps" });
  await expect(swapsCard.getByText("You've reached today's AI limit.", { exact: false })).toBeVisible();
  await expect(swapsCard.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("shows a clear message for a product that doesn't exist", async ({ page }) => {
  await continueAsGuest(page, "/food/999999");
  await expect(page.getByRole("heading", { name: "Product not found" })).toBeVisible();
});
