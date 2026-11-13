import { granola, muesli } from "./data";
import { continueAsGuest, expect, expectNoHorizontalScroll, test } from "./fixtures";

test.describe("phone layout", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone-only checks");

  test("pages fit the screen and the tab bar reaches every section", async ({ page }) => {
      await continueAsGuest(page, "/search?q=granola");
    await expect(page.getByRole("region", { name: "Results" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    const tabs = page.getByRole("navigation", { name: "Main" });
    await expect(tabs.getByRole("link")).toHaveText(["Search", "Scan", "Compare", "Favorites", "Guest"]);

    await page.goto(`/food/${granola.fdcId}`);
    await page.getByRole("button", { name: "Find swaps" }).click();
    await expect(page.getByRole("list", { name: "Suggested swaps" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto(`/compare?ids=${granola.fdcId},${muesli.fdcId}`);
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await tabs.getByRole("link", { name: "Scan" }).click();
    await expect(page).toHaveURL(/\/scan$/);
    await expectNoHorizontalScroll(page);
  });
});
