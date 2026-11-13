import { continueAsGuest, expect, test } from "./fixtures";

test("searches, keeps the query in the URL, and opens a product", async ({ page, backend }) => {
  await continueAsGuest(page, "/search");

  await page.getByRole("searchbox").fill("granola");
  await expect(page).toHaveURL(/q=granola/);
  const results = page.getByRole("region", { name: "Results" });
  await expect(results.getByRole("link", { name: "Honey Nut Granola Clusters" })).toBeVisible();

  await page.getByRole("radio", { name: "Brands" }).click();
  await expect(page).toHaveURL(/type=branded/);
  expect(backend.callsTo("search_foods").at(-1)).toMatchObject({ query: "granola", dataType: "branded" });

  await results.getByRole("link", { name: "Honey Nut Granola Clusters" }).click();
  await expect(page).toHaveURL(/\/food\/1001$/);
  await expect(page.getByRole("heading", { name: "Honey Nut Granola Clusters", level: 1 })).toBeVisible();

  // Back keeps the search.
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("granola");
});

test("says so when nothing matches", async ({ page }) => {
  await continueAsGuest(page, "/search?q=zzzz");
  await expect(page.getByRole("heading", { name: /No matches for/ })).toBeVisible();
});
