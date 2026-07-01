import { config } from "dotenv"
import { existsSync } from "node:fs"

// Vitest does not auto-load .env.local the way Next.js does. Mirror
// scripts/_load-env.ts so `pnpm test` picks up a local DATABASE_URL and the
// DB-gated integration tests actually run instead of silently skipping.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file })
}
