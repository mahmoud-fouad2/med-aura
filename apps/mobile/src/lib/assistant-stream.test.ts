import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, NetworkError } from "./request-errors"
import { streamAssistant } from "./assistant-stream"

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), getCookie: vi.fn(() => "session=test") }))

vi.mock("expo/fetch", () => ({ fetch: mocks.fetch }))
vi.mock("react-native", () => ({ Platform: { OS: "android" } }))
vi.mock("./config", () => ({ API_URL: "https://example.test" }))
vi.mock("./auth-client", () => ({ authClient: { getCookie: mocks.getCookie } }))

const encoder = new TextEncoder()

function chunkedResponse(chunks: string[]): Response {
  let index = 0
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= chunks.length) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(chunks[index++]))
      },
    }),
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  )
}

beforeEach(() => {
  mocks.fetch.mockReset()
  mocks.getCookie.mockClear()
})

describe("assistant native stream", () => {
  it("reads split NDJSON chunks and reports genuine stages", async () => {
    mocks.fetch.mockResolvedValueOnce(
      chunkedResponse([
        '{"type":"stage","stage":"under',
        'standing"}\n{"type":"heartbeat"}\n',
        '{"type":"result","reply":"تم","followups":["التالي"],"doctors":[]}\n',
      ]),
    )
    const stages: string[] = []

    await expect(
      streamAssistant([{ role: "user", content: "مرحبا" }], (stage) => stages.push(stage)),
    ).resolves.toEqual({ reply: "تم", followups: ["التالي"], doctors: [] })
    expect(stages).toEqual(["understanding"])
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://example.test/api/mobile/v1/assistant",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Cookie: "session=test" }),
      }),
    )
  })

  it("uses offline only when the request cannot reach the server", async () => {
    mocks.fetch.mockRejectedValueOnce(new TypeError("Network request failed"))
    await expect(
      streamAssistant([{ role: "user", content: "مرحبا" }], () => undefined),
    ).rejects.toBeInstanceOf(NetworkError)
  })

  it("classifies a broken response stream as interrupted, not offline", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('{"type":"stage","stage":"understanding"}\n'))
        },
        pull(controller) {
          controller.error(new Error("socket closed"))
        },
      }),
      { status: 200 },
    )
    mocks.fetch.mockResolvedValueOnce(response)

    const error = await streamAssistant(
      [{ role: "user", content: "مرحبا" }],
      () => undefined,
    ).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).not.toBeInstanceOf(NetworkError)
    expect((error as ApiError).code).toBe("ASSISTANT_INTERRUPTED")
  })

  it("preserves structured server errors", async () => {
    mocks.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: false, error: "المساعد غير متاح.", code: "ASSISTANT_UNAVAILABLE" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    )
    const error = await streamAssistant(
      [{ role: "user", content: "مرحبا" }],
      () => undefined,
    ).catch((cause: unknown) => cause)
    expect(error).toMatchObject({ status: 503, code: "ASSISTANT_UNAVAILABLE" })
  })
})
