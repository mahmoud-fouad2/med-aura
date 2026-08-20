import { Platform } from "react-native"
import { fetch as expoFetch } from "expo/fetch"
import { API_URL } from "./config"
import { authClient } from "./auth-client"
import { consumeNdjsonChunk } from "./ndjson"
import {
  ApiError,
  NetworkError,
  RateLimitedError,
  SessionExpiredError,
  TimeoutError,
} from "./request-errors"

/** A doctor the AI concierge recommended, rendered as a tappable card. */
export type AssistantDoctor = {
  id: string
  slug: string
  name: string
  title: string | null
  city: string | null
  consultationFee: string | null
  currency: string
  photoUrl: string | null
}

export type AssistantTurn = { role: "user" | "assistant"; content: string }

export type AssistantResponse = {
  reply: string
  followups: string[]
  doctors: AssistantDoctor[]
}

export type AssistantStage =
  | "understanding"
  | "searching_doctors"
  | "reviewing_procedures"
  | "finalizing"

const STAGES = new Set<AssistantStage>([
  "understanding",
  "searching_doctors",
  "reviewing_procedures",
  "finalizing",
])

/** Heartbeats arrive every five seconds; this only fires after genuine silence. */
const AI_INACTIVITY_TIMEOUT_MS = 30_000
const AI_HARD_TIMEOUT_MS = 90_000

function asStage(value: unknown): AssistantStage | null {
  return typeof value === "string" && STAGES.has(value as AssistantStage)
    ? (value as AssistantStage)
    : null
}

function resultFromEvent(event: Record<string, unknown>): AssistantResponse | null {
  if (event.type !== "result" || typeof event.reply !== "string") return null
  return {
    reply: event.reply,
    followups: Array.isArray(event.followups)
      ? event.followups.filter((value): value is string => typeof value === "string")
      : [],
    doctors: Array.isArray(event.doctors) ? (event.doctors as AssistantDoctor[]) : [],
  }
}

async function responseError(response: Response): Promise<Error> {
  if (response.status === 401) return new SessionExpiredError()
  const body = (await response.json().catch(() => null)) as
    | { error?: string; code?: string }
    | null
  const message = body?.error || "تعذّر الوصول إلى المساعد الآن."
  if (response.status === 429 || body?.code === "RATE_LIMITED") {
    return new RateLimitedError(message)
  }
  return new ApiError(message, response.status, body?.code)
}

/**
 * Stream the assistant over Expo 57's native WinterCG fetch implementation.
 * Unlike React Native XMLHttpRequest, this consumes actual byte chunks and
 * does not turn an interrupted response into a false "offline" diagnosis.
 */
export async function streamAssistant(
  messages: AssistantTurn[],
  onStage: (stage: AssistantStage) => void,
): Promise<AssistantResponse> {
  const controller = new AbortController()
  let abortReason: "inactivity" | "hard" | null = null
  let responseStarted = false
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null

  const resetInactivity = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      abortReason = "inactivity"
      controller.abort()
    }, AI_INACTIVITY_TIMEOUT_MS)
  }

  const hardTimer = setTimeout(() => {
    abortReason = "hard"
    controller.abort()
  }, AI_HARD_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
    }
    if (Platform.OS !== "web") {
      const cookie = authClient.getCookie()
      if (cookie) headers.Cookie = cookie
    }

    const response = await expoFetch(`${API_URL}/api/mobile/v1/assistant`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages }),
      signal: controller.signal,
      ...(Platform.OS === "web" ? { credentials: "include" as const } : {}),
    })
    responseStarted = true
    if (!response.ok) throw await responseError(response)
    if (!response.body) {
      throw new ApiError("تعذّر بدء رد المساعد.", 502, "ASSISTANT_INTERRUPTED")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let remainder = ""
    resetInactivity()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      resetInactivity()
      const parsed = consumeNdjsonChunk(remainder, decoder.decode(value, { stream: true }))
      remainder = parsed.remainder

      for (const event of parsed.events) {
        if (event.type === "heartbeat") continue
        const stage = event.type === "stage" ? asStage(event.stage) : null
        if (stage) {
          onStage(stage)
          continue
        }
        const result = resultFromEvent(event)
        if (result) {
          await reader.cancel().catch(() => undefined)
          return result
        }
        if (event.type === "error") {
          const message =
            typeof event.message === "string" ? event.message : "المساعد غير متاح حاليًا."
          if (event.reason === "rate_limited") throw new RateLimitedError(message)
          throw new ApiError(message, 503, "ASSISTANT_UNAVAILABLE")
        }
      }
    }

    const final = consumeNdjsonChunk(remainder, decoder.decode(), true)
    for (const event of final.events) {
      const result = resultFromEvent(event)
      if (result) return result
    }
    throw new ApiError("انقطع رد المساعد قبل اكتماله.", 502, "ASSISTANT_INTERRUPTED")
  } catch (cause) {
    if (
      cause instanceof ApiError ||
      cause instanceof RateLimitedError ||
      cause instanceof SessionExpiredError ||
      cause instanceof TimeoutError ||
      cause instanceof NetworkError
    ) {
      throw cause
    }
    if (abortReason) throw new TimeoutError(abortReason, { cause })
    if (responseStarted) {
      throw new ApiError("انقطع رد المساعد قبل اكتماله.", 502, "ASSISTANT_INTERRUPTED", {
        cause,
      })
    }
    throw new NetworkError("assistant unreachable", { cause })
  } finally {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    clearTimeout(hardTimer)
  }
}
