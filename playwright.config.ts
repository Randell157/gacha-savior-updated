import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (`npm run test:e2e`). Playwright starts empty Auth and
// Firestore emulators (nothing is imported or exported) and its own dev server
// on port 3100 pointed at them, then stops both when the run ends. (Not
// `firebase emulators:exec`: on Windows it leaves the Firestore emulator
// running.) It never reuses a running server, so a test can't reach the live
// Firebase project through a plain `npm run dev`.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The dev server compiles pages on first visit, so allow for slow first loads.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Chrome rather than Playwright's own Chromium, so nothing extra downloads.
    ...devices["Desktop Chrome"],
    channel: "chrome",
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx firebase emulators:start --project demo-gachasavior --only auth,firestore",
      // Firestore starts last; global-setup checks Auth too.
      url: "http://127.0.0.1:8080",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx cross-env NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gachasavior FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 next dev --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
