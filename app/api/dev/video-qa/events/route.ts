import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { isVideoQaEnabled } from "@/lib/env"
import { requireMobileUser, jsonError, jsonOk } from "@/lib/mobile-api"
import { recordQaEvent, QaVideoError } from "@/lib/video/qa"

export const dynamic = "force-dynamic"

/**
 * QA-ONLY: the test patient/doctor app instances call this while in a QA
 * video room to log join/leave events (video_qa.patient_joined, etc.).
 * Gated by the flag plus the caller's own account being isTest=true — a real
 * patient or doctor can never reach this, even if they guessed the URL.
 */
const BodySchema = z.object({
  roomName: z.string().min(1),
  event: z.enum(["patient_joined", "doctor_joined", "patient_left", "doctor_left"]),
})

export async function POST(request: Request) {
  if (!isVideoQaEnabled()) return jsonError("غير موجود.", 404)

  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  const row = (
    await db
      .select({ isTest: userTable.isTest })
      .from(userTable)
      .where(eq(userTable.id, auth.user.id))
      .limit(1)
  )[0]
  if (!row?.isTest) return jsonError("هذا الإجراء غير متاح لحسابك.", 403)

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return jsonError("بيانات غير صحيحة.", 400)

  try {
    await recordQaEvent({
      roomName: parsed.data.roomName,
      actorUserId: auth.user.id,
      event: parsed.data.event,
    })
    return jsonOk({ ok: true })
  } catch (err) {
    if (err instanceof QaVideoError) return jsonError(err.message, err.status)
    return jsonError("تعذّر تسجيل الحدث.", 500)
  }
}
