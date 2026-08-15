import { z } from "zod"
import { isAiConfigured } from "@/lib/env"
import { runAssistant } from "@/lib/ai/assistant"
import { absolutize, jsonError, jsonOk, jsonServerError, requireMobileUser } from "@/lib/mobile-api"

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

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)

  try {
    const result = await runAssistant(parsed.data.messages)
    return jsonOk({
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
    // The assistant already retries transient 503/429/network failures across
    // a model fallback chain, so reaching here means the provider stayed
    // unavailable — say so honestly rather than blaming the patient's input.
    return jsonServerError(
      "mobile.assistant",
      err,
      "المساعد مشغول حاليًا. حاول مرة أخرى بعد لحظات.",
    )
  }
}
