import { describe, it, expect, vi, beforeEach } from "vitest"
// vi.mock calls below are hoisted above this import by Vitest, so runAssistant
// resolves against the fakes rather than the real SDK and data layer.
import { runAssistant } from "@/lib/ai/assistant"

/**
 * Gemini 3 attaches an encrypted `thoughtSignature` to each functionCall part.
 * Google's docs: "You MUST always resend all thought blocks exactly as they
 * were received from the model."
 *
 * The concierge rebuilt the model turn from `response.functionCalls`, which
 * drops those signatures, and every tool-using reply died with:
 *   400 "Function call is missing a thought_signature in functionCall parts"
 *
 * This drives runAssistant through a fake SDK and asserts the echoed turn is
 * byte-for-byte what the model sent.
 */

const generateContent = vi.fn()

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  // The module builds tool schemas from this enum at import time.
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
    ARRAY: "ARRAY",
  },
  ThinkingLevel: {
    MINIMAL: "MINIMAL",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
  },
}))

vi.mock("@/lib/env", () => ({ requireEnv: () => "test-key" }))
vi.mock("@/lib/data/doctors", () => ({ searchDoctors: async () => ({ results: [], total: 0 }) }))
vi.mock("@/lib/data/procedures", () => ({ listProceduresGrouped: async () => [] }))

const SIGNATURE = "EncryptedThoughtSignature=="

beforeEach(() => {
  generateContent.mockReset()
})

describe("thought signature round-trip", () => {
  it("echoes the model's function-call parts back unmodified", async () => {
    // Turn 1: a function call carrying a thought signature.
    generateContent.mockResolvedValueOnce({
      functionCalls: [{ name: "set_followups", args: { chips: ["س؟"] } }],
      candidates: [
        {
          content: {
            role: "model",
            parts: [
              {
                functionCall: { name: "set_followups", args: { chips: ["س؟"] } },
                thoughtSignature: SIGNATURE,
              },
            ],
          },
        },
      ],
    })
    // Turn 2: plain text, which ends the tool loop.
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "تم." })

    const result = await runAssistant([{ role: "user", content: "مرحبا" }])
    expect(result.reply).toBe("تم.")
    expect(result.followups).toEqual(["س؟"])

    // The second request must carry the model turn WITH its signature intact.
    const secondRequest = generateContent.mock.calls[1][0]
    const modelTurn = secondRequest.contents.find(
      (c: { role: string }) => c.role === "model",
    )
    expect(modelTurn).toBeDefined()
    expect(modelTurn.parts[0].thoughtSignature).toBe(SIGNATURE)
  })

  it("still works when the model sends no signature", async () => {
    // Older/other models omit it entirely — that must not break the loop.
    generateContent.mockResolvedValueOnce({
      functionCalls: [{ name: "list_procedures", args: {} }],
      candidates: [
        { content: { role: "model", parts: [{ functionCall: { name: "list_procedures", args: {} } }] } },
      ],
    })
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "ok" })

    const result = await runAssistant([{ role: "user", content: "الإجراءات؟" }])
    expect(result.reply).toBe("ok")

    const modelTurn = generateContent.mock.calls[1][0].contents.find(
      (c: { role: string }) => c.role === "model",
    )
    expect(modelTurn.parts[0].functionCall.name).toBe("list_procedures")
  })
})
