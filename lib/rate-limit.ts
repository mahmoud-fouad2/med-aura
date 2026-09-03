/**
 * Minimal fixed-window rate limiter for expensive API routes.
 *
 * Better Auth only rate-limits its own `/api/auth/*` endpoints, so everything
 * under `/api/mobile/v1/*` is unthrottled. That is fine for a cheap DB read
 * and decidedly not fine for the AI concierge, where one signed-in client
 * looping a request bills real money to the Gemini key.
 *
 * Production counters are stored atomically in PostgreSQL so multiple service
 * instances enforce one limit. A bounded in-memory limiter remains as a
 * fail-safe when the database is unavailable or unconfigured.
 */

import { createHash } from "node:crypto"
import { isDbConfigured, pool } from "@/lib/db"

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Drop expired buckets so the Map can't grow without bound. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

let lastSweep = 0
const SWEEP_INTERVAL_MS = 60_000

export type RateLimitResult = {
  ok: boolean
  /** Seconds until the window resets — surface as Retry-After. */
  retryAfterSeconds: number
}

/**
 * Consumes one unit against `key`. Returns `ok: false` once `limit` requests
 * have been made inside `windowMs`.
 */
export function consumeLocalRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()

  // Amortised cleanup — cheap, and avoids a timer that would keep the
  // process alive or leak across hot reloads in development.
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now)
    lastSweep = now
  }

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}

let lastDbSweep = 0
const DB_SWEEP_INTERVAL_MS = 5 * 60_000

function hashedKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/** Atomically consumes a rate-limit unit shared by every production instance. */
export async function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  if (!isDbConfigured) return consumeLocalRateLimit(key, options)

  const now = new Date()
  const resetAt = new Date(now.getTime() + options.windowMs)
  try {
    if (now.getTime() - lastDbSweep > DB_SWEEP_INTERVAL_MS) {
      await pool.query('DELETE FROM "api_rate_limit" WHERE "resetAt" < NOW() - INTERVAL \'1 day\'')
      lastDbSweep = now.getTime()
    }
    const result = await pool.query<{ count: number; resetAt: Date }>(
      `INSERT INTO "api_rate_limit" ("key", "count", "resetAt", "updatedAt")
       VALUES ($1, 1, $2, $3)
       ON CONFLICT ("key") DO UPDATE SET
         "count" = CASE
           WHEN "api_rate_limit"."resetAt" <= $3 THEN 1
           ELSE "api_rate_limit"."count" + 1
         END,
         "resetAt" = CASE
           WHEN "api_rate_limit"."resetAt" <= $3 THEN $2
           ELSE "api_rate_limit"."resetAt"
         END,
         "updatedAt" = $3
       RETURNING "count", "resetAt"`,
      [hashedKey(key), resetAt, now],
    )
    const bucket = result.rows[0]
    if (!bucket) return consumeLocalRateLimit(key, options)
    return {
      ok: bucket.count <= options.limit,
      retryAfterSeconds: bucket.count <= options.limit
        ? 0
        : Math.max(1, Math.ceil((new Date(bucket.resetAt).getTime() - now.getTime()) / 1000)),
    }
  } catch {
    return consumeLocalRateLimit(key, options)
  }
}

/** Test seam — drops all counters. */
export function resetRateLimits() {
  buckets.clear()
  lastSweep = 0
}
