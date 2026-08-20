import { describe, it, expect, vi, beforeEach } from "vitest"
// vi.mock calls below are hoisted above this import by Vitest, so runAssistant
// resolves against the fakes rather than the real SDK and data layer.
import { runAssistant } from "@/lib/ai/assistant"

/**
 * Production bug: a turn that genuinely found doctors (search_doctors
 * succeeded, cards rendered) still showed the client's generic "couldn't
 * respond" text, because the SDK's `.text` convenience getter came back
 * empty even though the candidate's raw parts held real text — and only the
 * closing-call branch fell back to reading the parts directly; the
 * early-return branch inside the round loop (the common case, hit whenever
 * the model finalizes within the tool budget) did not.
 */

const generateContent = vi.fn()
let searchResults: { id: string; name: string }[] = []

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY" },
  ThinkingLevel: { MINIMAL: "MINIMAL", LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
}))

vi.mock("@/lib/env", () => ({ requireEnv: () => "test-key" }))
vi.mock("@/lib/data/doctors", () => ({
  searchDoctors: async () => ({ results: searchResults, total: searchResults.length }),
}))
vi.mock("@/lib/data/procedures", () => ({ listProceduresGrouped: async () => [] }))

beforeEach(() => {
  generateContent.mockReset()
  searchResults = []
})

const DOCTOR = {
  id: "d1",
  slug: "dr-sara",
  name: "د. سارة العتيبي",
  title: "استشارية جراحة تجميل",
  city: "الرياض",
  consultationFee: "300",
  currency: "SAR",
  photoUrl: null,
}

describe("runAssistant empty-.text fallback", () => {
  it("falls back to the raw candidate parts when .text is empty on the early-return round", async () => {
    // .text getter comes back "", but the real answer is sitting in the
    // candidate's parts — the exact shape that produced the bug.
    generateContent.mockResolvedValueOnce({
      functionCalls: [],
      text: "",
      candidates: [{ content: { role: "model", parts: [{ text: "تفضلي، هذه توصياتي." }] } }],
    })

    const result = await runAssistant([{ role: "user", content: "مرحبا" }])
    expect(result.reply).toBe("تفضلي، هذه توصياتي.")
  })

  it("never surfaces an empty/error-looking reply when the round already found real doctors", async () => {
    searchResults = [DOCTOR]
    // Round 1: search_doctors succeeds and collects a real doctor.
    generateContent.mockResolvedValueOnce({
      functionCalls: [{ name: "search_doctors", args: { query: "بشرة" } }],
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ functionCall: { name: "search_doctors", args: { query: "بشرة" } } }],
          },
        },
      ],
    })
    // Round 2 (the early-return round): the model's .text AND its raw parts
    // both come back empty — the worst case.
    generateContent.mockResolvedValueOnce({ functionCalls: [], text: "", candidates: [] })

    const result = await runAssistant([{ role: "user", content: "أبحث عن علاج للبشرة" }])
    expect(result.doctors).toHaveLength(1)
    // Must NOT be empty — an empty reply renders as the client's generic
    // "couldn't respond" text directly above a list of doctors that worked.
    expect(result.reply.length).toBeGreaterThan(0)
    expect(result.reply).not.toBe("")
  })

  it("still falls back to the parts on the closing call once the tool-round budget is exhausted", async () => {
    const toolTurn = {
      functionCalls: [{ name: "list_procedures", args: {} }],
      candidates: [
        { content: { role: "model", parts: [{ functionCall: { name: "list_procedures", args: {} } }] } },
      ],
    }
    generateContent
      .mockResolvedValueOnce(toolTurn)
      .mockResolvedValueOnce(toolTurn)
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "",
        candidates: [{ content: { role: "model", parts: [{ text: "إليك الإجراءات المتاحة." }] } }],
      })

    const result = await runAssistant([{ role: "user", content: "ما الإجراءات المتاحة؟" }])
    expect(result.reply).toBe("إليك الإجراءات المتاحة.")
  })
})
