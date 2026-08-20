import { describe, it, expect, vi, beforeEach } from "vitest"
// vi.mock calls below are hoisted above this import by Vitest, so runAssistant
// resolves against the fakes rather than the real SDK and data layer.
import { MODEL_REQUEST_TIMEOUT_MS, MODELS, runAssistant } from "@/lib/ai/assistant"

/**
 * The AI chat screen shows "thinking stage" progress (e.g. "Searching
 * doctors…") while a turn is in flight, driven by the onStage callback fired
 * from real checkpoints inside the tool-calling loop — not cosmetic timers.
 * These tests assert the stages fire in order, from the right checkpoints,
 * for each shape a turn can take.
 */

const generateContent = vi.fn()

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY" },
  ThinkingLevel: { MINIMAL: "MINIMAL", LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
}))

vi.mock("@/lib/env", () => ({ requireEnv: () => "test-key" }))
vi.mock("@/lib/data/doctors", () => ({ searchDoctors: async () => ({ results: [], total: 0 }) }))
vi.mock("@/lib/data/procedures", () => ({ listProceduresGrouped: async () => [] }))

beforeEach(() => {
  generateContent.mockReset()
})

describe("runAssistant onStage", () => {
  it("fires understanding then finalizing for a reply with no tool calls", async () => {
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "أهلاً" })

    const stages: string[] = []
    await runAssistant([{ role: "user", content: "مرحبا" }], {}, (s) => stages.push(s))

    expect(stages).toEqual(["understanding", "finalizing"])
  })

  it("fires searching_doctors when the model calls search_doctors", async () => {
    generateContent.mockResolvedValueOnce({
      functionCalls: [{ name: "search_doctors", args: { query: "بوتوكس" } }],
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ functionCall: { name: "search_doctors", args: { query: "بوتوكس" } } }],
          },
        },
      ],
    })
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "تم" })

    const stages: string[] = []
    await runAssistant([{ role: "user", content: "ابحث لي عن طبيب" }], {}, (s) => stages.push(s))

    expect(stages).toEqual(["understanding", "searching_doctors", "finalizing"])
  })

  it("fires reviewing_procedures when the model calls list_procedures", async () => {
    generateContent.mockResolvedValueOnce({
      functionCalls: [{ name: "list_procedures", args: {} }],
      candidates: [
        { content: { role: "model", parts: [{ functionCall: { name: "list_procedures", args: {} } }] } },
      ],
    })
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "تم" })

    const stages: string[] = []
    await runAssistant([{ role: "user", content: "ما هي الإجراءات المتاحة؟" }], {}, (s) => stages.push(s))

    expect(stages).toEqual(["understanding", "reviewing_procedures", "finalizing"])
  })

  it("fires finalizing before the closing call once the tool-round budget is exhausted", async () => {
    // Every round keeps calling a tool, so the loop runs out of rounds (2)
    // and falls through to the no-tools closing call.
    const toolTurn = {
      functionCalls: [{ name: "list_procedures", args: {} }],
      candidates: [
        { content: { role: "model", parts: [{ functionCall: { name: "list_procedures", args: {} } }] } },
      ],
    }
    generateContent
      .mockResolvedValueOnce(toolTurn)
      .mockResolvedValueOnce(toolTurn)
      .mockResolvedValueOnce({ functionCalls: [], text: "تم أخيراً" })

    const stages: string[] = []
    const result = await runAssistant([{ role: "user", content: "..." }], {}, (s) => stages.push(s))

    expect(result.reply).toBe("تم أخيراً")
    // understanding once at the start, reviewing_procedures re-fired each
    // round a tool call comes back, then one final "finalizing" before the
    // closing call outside the loop.
    expect(stages[0]).toBe("understanding")
    expect(stages.at(-1)).toBe("finalizing")
    expect(stages.filter((s) => s === "reviewing_procedures")).toHaveLength(2)
  })

  it("works with no onStage callback provided", async () => {
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "ok" })
    const result = await runAssistant([{ role: "user", content: "hi" }])
    expect(result.reply).toBe("ok")
  })

  it("uses the fast model first and disables hidden SDK retries", async () => {
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "ok" })
    await runAssistant([{ role: "user", content: "hi" }])

    const request = generateContent.mock.calls[0][0]
    expect(request.model).toBe(MODELS[0])
    expect(request.config.httpOptions).toEqual({
      timeout: MODEL_REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    })
    expect(request.config.maxOutputTokens).toBe(512)
  })
})
