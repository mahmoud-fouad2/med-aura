import { defineConfig } from "drizzle-kit"

// `generate` works offline (no DB connection). `migrate`/`push`/`studio` use
// DATABASE_URL. A harmless fallback keeps `generate` working without a live DB.
export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/medaura",
  },
  verbose: true,
  strict: true,
})
