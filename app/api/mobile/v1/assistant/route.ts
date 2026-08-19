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

/** The AI concierge. Runs a Gemini function-calling turn server-side and
 *  returns the reply plus structured doctor cards + follow-up chips. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  if (!isAiConfigured()) {
    return jsonError("المساعد الذكي غير متاح حاليًا.", 503)
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
    return jsonError("لقد أرسلت رسائل كثيرة. انتظر قليلاً ثم حاول مجددًا.", 429)
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)

  // Hand the assistant what the account already knows, so it stops asking
  // the patient for their own city/name on every conversation.
  const profile = (
    await db
      .select({ city: patientProfile.city, country: patientProfile.residenceCountry })
      .from(patientProfile)
      .where(eq(patientProfile.userId, auth.user.id))
      .limit(1)
  )[0]

  // A single Gemini turn can legitimately run through several rounds of tool
  // calls, and the wall-clock total is genuinely unpredictable — a fixed
  // request timeout on the client can't tell "still working" apart from
  // "dead". Streaming NDJSON lets the client reset its timeout on every line
  // it receives instead of racing one deadline against the whole turn, and
  // lets it show real progress (see AssistantStage) instead of a static
  // spinner.
  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, line: object) => {
    controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Keeps the connection visibly alive for any idle-timeout proxy in the
      // path, independent of stage transitions — a single stage's real Gemini
      // latency can easily run longer than the heartbeat interval.
      const heartbeat = setInterval(() => send(controller, { type: "heartbeat" }), 7_000)

      try {
        const result = await runAssistant(
          parsed.data.messages,
          { name: auth.user.name, city: profile?.city ?? null, country: profile?.country ?? null },
          (stage) => send(controller, { type: "stage", stage }),
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
      } catch (err) {
        // The assistant already retries transient 503/network failures and
        // skips a rate-limited model to the next one in the chain, so
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
          send(controller, { type: "error", message: "المساعد مشغول حاليًا. حاول مرة أخرى بعد لحظات." })
        }
      } finally {
        clearInterval(heartbeat)
        controller.close()
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
