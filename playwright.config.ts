import { defineConfig, devices } from "@playwright/test"

/**
 * E2E config. Runs the built app against a real (migrated + seeded) database.
 * In CI the postgres service + migrate + seed run before this; locally you can
 * run: `pnpm build && DATABASE_URL=... ENABLE_DEMO_DATA=true pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    locale: "ar",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `npx next start` instead of `pnpm start`: Playwright spawns this command
    // with a bare shell that doesn't always resolve the `pnpm` shim (seen on
    // Windows), while `npx` reliably resolves the local next binary everywhere.
    command: "npx next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
