import { describe, expect, it } from "vitest"
import { ASSISTANT_CONTEXT_LIMIT, keepRecentItems } from "./assistant-context"

describe("assistant context", () => {
  it("keeps the newest turns within the server contract", () => {
    const turns = Array.from({ length: 30 }, (_, index) => index)
    const kept = keepRecentItems(turns, ASSISTANT_CONTEXT_LIMIT)
    expect(kept).toHaveLength(12)
    expect(kept[0]).toBe(18)
    expect(kept.at(-1)).toBe(29)
  })

  it("returns short conversations unchanged", () => {
    expect(keepRecentItems([1, 2], ASSISTANT_CONTEXT_LIMIT)).toEqual([1, 2])
  })
})
