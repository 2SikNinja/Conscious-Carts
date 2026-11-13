import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

/**
 * End-to-end tests run against a production build that talks to the Firebase
 * Auth emulator. Cloud Functions are stubbed per test (see e2e/fixtures.ts),
 * so no USDA or Gemini calls are made.
 *
 * Run with the emulator: `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // A demo- project id keeps the emulator fully offline.
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-conscious-carts.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-conscious-carts",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-conscious-carts.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000",
      NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION: "us-central1",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    },
  },
});
