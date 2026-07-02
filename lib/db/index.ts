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

/**
 * node-postgres requires an 'error' listener on the pool: serverless Postgres
 * (Neon) can auto-suspend and terminate idle connections from the backend
 * side, which otherwise surfaces as an uncaught exception and can take down
 * the process. Log and let the pool evict the dead client; callers already
 * handle query failures via safeRead()/query(). Guarded so dev hot-reload
 * doesn't stack a new listener on the cached pool every reload.
 */
if (pool.listenerCount("error") === 0) {
  pool.on("error", (err) => {
    console.warn("[db] idle client error (pool will reconnect):", err.message)
  })
}

export const db = drizzle(pool, { schema })

export * from "./schema"

export const isDbConfigured = Boolean(process.env.DATABASE_URL)

/**
 * Run a NON-critical read query, returning `fallback` when the database is
 * unconfigured or unreachable. This lets public pages render honest empty
 * states (instead of crashing) in environments without a database — e.g. local
 * preview. NEVER use this for mutations or anything that must not silently
 * no-op; those must surface real errors.
 */
export async function safeRead<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isDbConfigured) return fallback
  try {
    return await fn()
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[db] read failed, returning fallback:",
        err instanceof Error ? err.message : String(err),
      )
    }
    return fallback
  }
}

/** Lightweight connectivity probe used by scripts and the admin health page. */
export async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await pool.query("SELECT 1")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
