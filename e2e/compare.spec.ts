import { expect, continueAsGuest, test } from "./fixtures";

test("compares products picked from search and names the healthiest", async ({ page }) => {
  await continueAsGuest(page, "/search?q=clusters");

  await page.getByRole("button", { name: "Add Honey Nut Granola Clusters to compare" }).click();
  await page.getByRole("button", { name: "Add Unsweetened Oat Clusters to compare" }).click();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /Compare/ }).click();
  await expect(page).toHaveURL(/\/compare\?ids=1001(%2C|,)1003/);

  const pick = page.getByRole("region", { name: "Healthiest pick" });
  await expect(pick).toContainText("Unsweetened Oat Clusters");
  await expect(pick).toContainText("32 points higher");

  await page.getByRole("button", { name: "Remove Unsweetened Oat Clusters" }).click();
  await expect(page).toHaveURL(/\/compare\?ids=1001$/);
  await expect(page.getByText("Add at least one more product to compare.")).toBeVisible();
});

test("opens a shared comparison link", async ({ page }) => {
  await continueAsGuest(page, "/compare?ids=1001,1002");
  await expect(page.getByRole("region", { name: "Healthiest pick" })).toContainText("Muesli with Seeds");
  await expect(page.getByRole("table")).toContainText("Health score");
});
