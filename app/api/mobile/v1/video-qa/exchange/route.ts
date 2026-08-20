import { z } from "zod"
import { isVideoQaEnabled } from "@/lib/env"
import { jsonError, jsonOk, jsonServerError, requireMobileUser } from "@/lib/mobile-api"
import { exchangeQaJoinTicket, QaVideoError } from "@/lib/video/qa"

export const dynamic = "force-dynamic"

const BodySchema = z.object({
  ticket: z.string().min(32).max(256),
})

export async function POST(request: Request) {
  if (!isVideoQaEnabled()) return jsonError("غير موجود.", 404, "NOT_FOUND")

  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError("رابط جلسة الاختبار غير صالح.", 400, "VIDEO_QA_TICKET_INVALID")
  }

  try {
    const grant = await exchangeQaJoinTicket({
      ticket: parsed.data.ticket,
      actorUserId: auth.user.id,
    })
    return jsonOk({ ...grant, expiresAt: grant.expiresAt.toISOString() })
  } catch (error) {
    if (error instanceof QaVideoError) {
      return jsonError(error.message, error.status, error.code)
    }
    return jsonServerError("mobile.videoQa.exchange", error, "تعذّر بدء جلسة الاختبار.")
  }
}
