import { describe, it, expect, vi } from "vitest"
import { isTransient, withModelFallback } from "@/lib/ai/assistant"

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
      if (model === "gemini-flash-latest") {
        throw Object.assign(new Error("high demand"), { status: 503 })
      }
      return "ok"
    })

    const promise = withModelFallback(call)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe("ok")
    vi.useRealTimers()

    // 3 attempts on the primary, then the lite model answers.
    expect(seen.filter((m) => m === "gemini-flash-latest")).toHaveLength(3)
    expect(seen.at(-1)).toBe("gemini-flash-lite-latest")
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
})
