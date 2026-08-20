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
    // Match production's standalone runtime and load local env files without
    // replacing environment variables supplied by CI or the hosting platform.
    command:
      "node --env-file-if-exists=.env --env-file-if-exists=.env.local --max-old-space-size=320 .next/standalone/server.js",
    env: {
      // CI uses demo data while seeding. The running production-mode server
      // must never inherit that flag, even inside an isolated E2E database.
      ENABLE_DEMO_DATA: "false",
      HOSTNAME: "0.0.0.0",
      PORT: "3000",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
