import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

/**
 * In development, Next.js hot-reload re-imports modules, which would otherwise
 * create a new pg Pool on every reload and exhaust connections. Cache the pool
 * on globalThis so a single pool survives reloads.
 */
const globalForDb = globalThis as unknown as { __medAuraPool?: Pool }

export const pool =
  globalForDb.__medAuraPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__medAuraPool = pool
}

export const db = drizzle(pool, { schema })

export * from "./schema"

/** Lightweight connectivity probe used by scripts and the admin health page. */
export async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await pool.query("SELECT 1")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
