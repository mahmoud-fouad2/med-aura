import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { consumeRateLimit, resetRateLimits } from "@/lib/rate-limit"

/**
 * Guards the throttle in front of the AI concierge — the one route where an
 * unthrottled client spends real money on every request.
 */
describe("consumeRateLimit", () => {
  beforeEach(() => resetRateLimits())
  afterEach(() => vi.useRealTimers())

  const opts = { limit: 3, windowMs: 60_000 }

  it("allows up to the limit, then rejects", () => {
    for (let i = 0; i < 3; i++) {
      expect(consumeRateLimit("user:a", opts).ok).toBe(true)
    }
    const blocked = consumeRateLimit("user:a", opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("keys separately per user, so one client can't throttle another", () => {
    for (let i = 0; i < 3; i++) consumeRateLimit("user:a", opts)
    expect(consumeRateLimit("user:a", opts).ok).toBe(false)
    // A different user is unaffected.
    expect(consumeRateLimit("user:b", opts).ok).toBe(true)
  })

  it("recovers once the window elapses", () => {
    vi.useFakeTimers()
    for (let i = 0; i < 3; i++) consumeRateLimit("user:c", opts)
    expect(consumeRateLimit("user:c", opts).ok).toBe(false)

    vi.advanceTimersByTime(60_001)
    expect(consumeRateLimit("user:c", opts).ok).toBe(true)
  })

  it("does not leak buckets for keys whose window has passed", () => {
    vi.useFakeTimers()
    // Many one-off keys, as a burst of distinct users would produce.
    for (let i = 0; i < 500; i++) consumeRateLimit(`ephemeral:${i}`, opts)
    // Past the window and the sweep interval, a new call prunes the expired
    // entries rather than growing the map forever.
    vi.advanceTimersByTime(120_000)
    expect(consumeRateLimit("trigger:sweep", opts).ok).toBe(true)
    // The previously-seen keys start fresh, proving they were dropped.
    expect(consumeRateLimit("ephemeral:0", opts).ok).toBe(true)
  })
})
