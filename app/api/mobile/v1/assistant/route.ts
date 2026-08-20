import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile } from "@/lib/db/schema"
import { isAiConfigured } from "@/lib/env"
import { isRateLimited, runAssistant, type AssistantStage } from "@/lib/ai/assistant"
import { consumeRateLimit } from "@/lib/rate-limit"
import { absolutize, jsonError, requireMobileUser } from "@/lib/mobile-api"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    // Bound the context we forward to the model — keep the most recent turns.
    .max(24),
})

const MAX_MODEL_MESSAGES = 12

/** The AI concierge. Runs a Gemini function-calling turn server-side and
 *  returns the reply plus structured doctor cards + follow-up chips. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  if (!isAiConfigured()) {
    return jsonError("المساعد الذكي غير متاح حاليًا.", 503, "ASSISTANT_UNAVAILABLE")
  }

  // Every turn is a multi-round Gemini call billed to our key, so a client
  // stuck in a retry loop — or abusing a valid session — would spend real
  // money. 20 turns per 5 minutes is far above normal conversation pace and
  // still caps the damage. Keyed per user, not per IP, so one bad actor
  // can't throttle everyone sharing a carrier NAT.
  const limit = consumeRateLimit(`assistant:${auth.user.id}`, {
    limit: 20,
    windowMs: 5 * 60_000,
  })
  if (!limit.ok) {
    return jsonError("لقد أرسلت رسائل كثيرة. انتظر قليلاً ثم حاول مجددًا.", 429, "RATE_LIMITED")
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  const modelMessages = parsed.data.messages.slice(-MAX_MODEL_MESSAGES)

  // A single Gemini turn can legitimately run through several rounds of tool
  // calls, and the wall-clock total is genuinely unpredictable — a fixed
  // request timeout on the client can't tell "still working" apart from
  // "dead". Streaming NDJSON lets the client reset its timeout on every line
  // it receives instead of racing one deadline against the whole turn, and
  // lets it show real progress (see AssistantStage) instead of a static
  // spinner.
  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, line: object) => {
    try {
      controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
      return true
    } catch {
      return false
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now()
      let lastStage: AssistantStage | null = "understanding"
      send(controller, { type: "stage", stage: lastStage })
      // Keeps the connection visibly alive for any idle-timeout proxy in the
      // path, independent of stage transitions — a single stage's real Gemini
      // latency can easily run longer than the heartbeat interval.
      const heartbeat = setInterval(() => send(controller, { type: "heartbeat" }), 5_000)

      try {
        // Load profile context after the stream has started so the user sees
        // immediate progress instead of waiting on auth + a silent DB query.
        const profile = (
          await db
            .select({ city: patientProfile.city, country: patientProfile.residenceCountry })
            .from(patientProfile)
            .where(eq(patientProfile.userId, auth.user.id))
            .limit(1)
        )[0]

        const result = await runAssistant(
          modelMessages,
          { name: auth.user.name, city: profile?.city ?? null, country: profile?.country ?? null },
          (stage) => {
            if (stage === lastStage) return
            lastStage = stage
            send(controller, { type: "stage", stage })
          },
        )
        send(controller, {
          type: "result",
          reply: result.reply,
          followups: result.followups,
          doctors: result.doctors.map((d) => ({
            id: d.id,
            slug: d.slug,
            name: d.name,
            title: d.title,
            city: d.city,
            consultationFee: d.consultationFee,
            currency: d.currency,
            photoUrl: absolutize(d.photoUrl),
          })),
        })
        logger.info("mobile.assistant completed", {
          durationMs: Date.now() - startedAt,
          turns: modelMessages.length,
          doctors: result.doctors.length,
        })
      } catch (err) {
        // The assistant already moves transient 503/network failures and a
        // rate-limited model to the next capacity pool, so
        // reaching here means every model was unavailable. Distinguish a
        // free-tier quota hit — the honest fix is "wait a bit", not "try
        // again right now" — from a genuine provider outage.
        logger.error("mobile.assistant failed", {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        })
        if (isRateLimited(err)) {
          send(controller, {
            type: "error",
            reason: "rate_limited",
            message: "المساعد وصل لحد الطلبات المسموح به حاليًا. انتظر دقيقة وحاول مرة أخرى.",
          })
        } else {
          send(controller, {
            type: "error",
            reason: "unavailable",
            message: "المساعد مشغول حاليًا. حاول مرة أخرى بعد لحظات.",
          })
        }
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // The app may have left the screen after the provider call began.
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
