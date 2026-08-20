import { describe, expect, it } from "vitest"
import { consumeNdjsonChunk } from "./ndjson"

describe("consumeNdjsonChunk", () => {
  it("keeps a partial line until the next network chunk", () => {
    const first = consumeNdjsonChunk("", '{"type":"sta')
    expect(first.events).toEqual([])
    expect(first.remainder).toBe('{"type":"sta')

    const second = consumeNdjsonChunk(first.remainder, 'ge","stage":"understanding"}\n')
    expect(second.events).toEqual([{ type: "stage", stage: "understanding" }])
    expect(second.remainder).toBe("")
  })

  it("parses multiple lines and ignores malformed complete lines", () => {
    const result = consumeNdjsonChunk(
      "",
      '{"type":"heartbeat"}\nnot-json\n{"type":"result","reply":"ok"}\n',
    )
    expect(result.events).toEqual([
      { type: "heartbeat" },
      { type: "result", reply: "ok" },
    ])
  })

  it("flushes a final line even without a newline", () => {
    const result = consumeNdjsonChunk("", '{"type":"result"}', true)
    expect(result.events).toEqual([{ type: "result" }])
    expect(result.remainder).toBe("")
  })
})
