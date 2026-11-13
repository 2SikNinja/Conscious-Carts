import { granola } from "./data";
import { continueAsGuest, expect, test } from "./fixtures";

test("looks up a typed barcode and opens the product", async ({ page, backend }) => {
  await continueAsGuest(page, "/scan");
  await page.getByLabel("Type the number").fill("0 36000 29145 2");
  await page.getByRole("button", { name: "Look up" }).click();

  await expect(page).toHaveURL(new RegExp(`/food/${granola.fdcId}$`));
  await expect(page.getByRole("heading", { name: granola.description, level: 1 })).toBeVisible();
  expect(backend.callsTo("lookup_barcode")).toEqual([{ code: "036000291452" }]);
  // The lookup already returned the product, so the page doesn't fetch it again.
  expect(backend.callsTo("get_food")).toHaveLength(0);
});

test("catches a mistyped barcode before looking it up", async ({ page, backend }) => {
  await continueAsGuest(page, "/scan");
  await page.getByLabel("Type the number").fill("036000291453");
  await page.getByRole("button", { name: "Look up" }).click();

  await expect(page.getByText("That number doesn't check out.", { exact: false })).toBeVisible();
  expect(backend.callsTo("lookup_barcode")).toHaveLength(0);
});

test("offers a way forward when USDA has no match", async ({ page }) => {
  await continueAsGuest(page, "/scan");
  await page.getByLabel("Type the number").fill("012345678905");
  await page.getByRole("button", { name: "Look up" }).click();

  await expect(page.getByText("No match for 012345678905")).toBeVisible();
  await expect(page.getByRole("link", { name: "Search by name" })).toHaveAttribute("href", "/search");
});
