import { test as base, expect, type Page, type Route } from "@playwright/test";

import { aiLimitError, allProducts, analysis, summaryOf, swaps } from "./data";

type Handler = (data: Record<string, unknown>) => unknown;

/** Stubs the callable Cloud Functions. Each test can override any of them. */
export class Backend {
  readonly calls: Record<string, Record<string, unknown>[]> = {};
  private readonly handlers: Record<string, Handler> = {
    search_foods: (data) => {
      const query = String(data.query ?? "").toLowerCase();
      const foods = allProducts.filter((food) => food.description.toLowerCase().includes(query)).map(summaryOf);
      return { foods, totalHits: foods.length, pageNumber: 1, totalPages: 1 };
    },
    get_food: (data) => allProducts.find((food) => food.fdcId === data.fdcId) ?? fail("NOT_FOUND", "That food was not found."),
    get_foods: (data) => ({
      foods: (data.fdcIds as number[]).map((id) => allProducts.find((food) => food.fdcId === id)).filter(Boolean),
    }),
    analyze_food: (data) => ({ ...analysis, fdcId: data.fdcId }),
    suggest_swaps: (data) => ({ ...swaps, fdcId: data.fdcId }),
    lookup_barcode: (data) => {
      const food = allProducts.find((item) => item.upc && String(data.code).endsWith(item.upc));
      return { found: Boolean(food), food: food ?? null };
    },
  };

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route("**/us-central1/*", (route) => this.handle(route));
  }

  /** Replaces one function's response for the rest of the test. */
  on(name: string, handler: Handler) {
    this.handlers[name] = handler;
  }

  /** Makes one function fail with the AI quota error. */
  failWithAiLimit(name: string) {
    this.on(name, () => fail(aiLimitError.status, aiLimitError.message));
  }

  callsTo(name: string) {
    return this.calls[name] ?? [];
  }

  private async handle(route: Route) {
    const name = new URL(route.request().url()).pathname.split("/").pop() ?? "";
    const handler = this.handlers[name];
    if (!handler) return route.fulfill({ status: 404, body: "Unknown function" });

    const data = (route.request().postDataJSON()?.data ?? {}) as Record<string, unknown>;
    (this.calls[name] ??= []).push(data);
    try {
      return await route.fulfill({ json: { result: handler(data) } });
    } catch (error) {
      if (error instanceof CallableError) {
        return route.fulfill({ status: error.httpStatus, json: { error: { status: error.status, message: error.message } } });
      }
      throw error;
    }
  }
}

class CallableError extends Error {
  constructor(
    readonly status: string,
    message: string,
  ) {
    super(message);
  }

  get httpStatus() {
    return { NOT_FOUND: 404, RESOURCE_EXHAUSTED: 429, INVALID_ARGUMENT: 400 }[this.status] ?? 500;
  }
}

function fail(status: string, message: string): never {
  throw new CallableError(status, message);
}

/** Starts a guest session from the sign-in page, then waits to land on `path`. */
export async function continueAsGuest(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.waitForURL((url) => decodeURIComponent(url.pathname + url.search) === path);
}

/** Fails when the page scrolls sideways, which usually means something overflows on phones. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export const test = base.extend<{ backend: Backend }>({
  // Automatic, so no test can reach a real Cloud Function by accident.
  backend: [
    async ({ page }, use) => {
      const backend = new Backend(page);
      await backend.install();
      await use(backend);
    },
    { auto: true },
  ],
});

export { expect };
