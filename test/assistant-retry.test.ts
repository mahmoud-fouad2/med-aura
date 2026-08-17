import { describe, it, expect, vi } from "vitest"
import {
  ATTEMPTS_PER_MODEL,
  MODELS,
  isModelUnavailable,
  isTransient,
  withModelFallback,
} from "@/lib/ai/assistant"

/**
 * The AI concierge went down in production twice: first a hard 404 (a pinned
 * model was retired), then repeated 503 "high demand" and bare "fetch failed"
 * errors surfacing straight to the patient. These lock in the retry +
 * model-fallback behaviour that replaced the single unguarded call.
 */
describe("assistant transient-failure detection", () => {
  it("treats provider overload and network blips as retryable", () => {
    // The exact shapes seen in the Render logs.
    expect(
      isTransient(
        new Error(
          '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
        ),
      ),
    ).toBe(true)
    expect(isTransient(new TypeError("fetch failed"))).toBe(true)
    expect(isTransient(Object.assign(new Error("rate limited"), { status: 429 }))).toBe(true)
    expect(isTransient(Object.assign(new Error("boom"), { status: 500 }))).toBe(true)
  })

  it("does not retry real bugs or bad credentials", () => {
    expect(isTransient(Object.assign(new Error("bad key"), { status: 401 }))).toBe(false)
    expect(isTransient(Object.assign(new Error("nope"), { status: 400 }))).toBe(false)
    // A retired model returns 404 — retrying it forever would just stall.
    expect(isTransient(Object.assign(new Error("not found"), { status: 404 }))).toBe(false)
  })
})

describe("assistant model fallback", () => {
  it("retries the same model, then falls back to the next one", async () => {
    vi.useFakeTimers()
    const seen: string[] = []
    // Fail every attempt on the primary model, succeed on the fallback.
    const call = vi.fn(async (model: string) => {
      seen.push(model)
      if (model === MODELS[0]) {
        throw Object.assign(new Error("high demand"), { status: 503 })
      }
      return "ok"
    })

    const promise = withModelFallback(call)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe("ok")
    vi.useRealTimers()

    // Every attempt on the primary is used, then the next model answers.
    expect(seen.filter((m) => m === MODELS[0])).toHaveLength(ATTEMPTS_PER_MODEL)
    expect(seen.at(-1)).toBe(MODELS[1])
  })

  it("fails fast on a non-transient error without touching the fallback", async () => {
    const call = vi.fn(async () => {
      throw Object.assign(new Error("bad request"), { status: 400 })
    })
    await expect(withModelFallback(call)).rejects.toThrow("bad request")
    expect(call).toHaveBeenCalledTimes(1)
  })

  it("succeeds on the first try without any delay", async () => {
    const call = vi.fn(async () => "first")
    await expect(withModelFallback(call)).resolves.toBe("first")
    expect(call).toHaveBeenCalledTimes(1)
  })

  it("skips a retired model immediately instead of retrying it", async () => {
    // The exact failure that took the concierge down when it was pinned to
    // gemini-2.5-flash: the model 404s for this key. It must move to the next
    // model on the FIRST failure, not burn all three attempts on a dead ID.
    const seen: string[] = []
    const call = vi.fn(async (model: string) => {
      seen.push(model)
      if (model === MODELS[0]) {
        throw new Error(
          '{"error":{"code":404,"message":"This model is no longer available to new users.","status":"NOT_FOUND"}}',
        )
      }
      return "ok"
    })

    await expect(withModelFallback(call)).resolves.toBe("ok")
    // Exactly one attempt on the retired model, then straight to the next.
    expect(seen.filter((m) => m === MODELS[0])).toHaveLength(1)
    expect(seen[1]).toBe(MODELS[1])
  })
})

describe("configured assistant models", () => {
  it("pins GA model IDs, never the rate-limited -latest aliases", () => {
    // `gemini-flash-latest` resolves to an experimental model with much
    // tighter rate limits — it 503'd in production on near-zero traffic.
    for (const id of MODELS) {
      expect(id).not.toMatch(/-latest$/)
      expect(id).toMatch(/^gemini-\d+(\.\d+)?-flash(-lite)?$/)
    }
    // A fallback chain of one is not a fallback chain.
    expect(MODELS.length).toBeGreaterThanOrEqual(2)
    expect(new Set(MODELS).size).toBe(MODELS.length)
  })

  it("classifies retirement separately from overload", () => {
    const retired = Object.assign(new Error("not found"), { status: 404 })
    expect(isModelUnavailable(retired)).toBe(true)
    expect(isTransient(retired)).toBe(false)

    const overloaded = Object.assign(new Error("high demand"), { status: 503 })
    expect(isTransient(overloaded)).toBe(true)
    expect(isModelUnavailable(overloaded)).toBe(false)
  })
})
