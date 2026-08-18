/**
 * Minimal fixed-window rate limiter for expensive API routes.
 *
 * Better Auth only rate-limits its own `/api/auth/*` endpoints, so everything
 * under `/api/mobile/v1/*` is unthrottled. That is fine for a cheap DB read
 * and decidedly not fine for the AI concierge, where one signed-in client
 * looping a request bills real money to the Gemini key.
 *
 * Deliberately in-memory: the service runs a single instance with
 * WEB_CONCURRENCY=1, so a shared Map is accurate today and costs nothing.
 * If the service is ever scaled to multiple instances, each gets its own
 * counters and the effective limit multiplies by the instance count — move
 * this to the database or Redis at that point.
 */

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
export function consumeRateLimit(
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

/** Test seam — drops all counters. */
export function resetRateLimits() {
  buckets.clear()
  lastSweep = 0
}
