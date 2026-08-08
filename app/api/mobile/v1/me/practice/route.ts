import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { doctorProfile } from "@/lib/db/schema"
import { listDoctorProcedureOptions } from "@/lib/data/admin-directory"
import { updateMyPracticeAction } from "@/lib/actions/doctor"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * A doctor's own practice settings — price, currency, consultation types,
 * and which procedures they offer. Self-service: ownership (the row's
 * userId) is the authorization, same model as /api/mobile/v1/me/avatar's
 * doctorProfile self-edit. There is no equivalent web page yet — this is
 * genuinely new self-service capability, not a port — but the write path
 * (lib/actions/doctor.ts's updateMyPracticeAction) is shared, so a future
 * web page can reuse it without rework.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  try {
    const dp = (
      await db
        .select({
          id: doctorProfile.id,
          consultationFee: doctorProfile.consultationFee,
          currency: doctorProfile.currency,
          offersVideo: doctorProfile.offersVideo,
          offersInPerson: doctorProfile.offersInPerson,
          published: doctorProfile.published,
          status: doctorProfile.status,
        })
        .from(doctorProfile)
        .where(eq(doctorProfile.userId, auth.user.id))
        .limit(1)
    )[0]
    if (!dp) return jsonError("لم يتم العثور على ملف الطبيب.", 404)

    const procedures = await listDoctorProcedureOptions(dp.id)
    return jsonOk({
      consultationFee: dp.consultationFee,
      currency: dp.currency,
      offersVideo: dp.offersVideo,
      offersInPerson: dp.offersInPerson,
      published: dp.published,
      status: dp.status,
      procedures,
    })
  } catch (err) {
    return jsonServerError("mobile.me.practice", err)
  }
}

const PatchSchema = z.object({
  consultationFee: z.number().min(0).optional(),
  currency: z.string().trim().length(3),
  offersVideo: z.boolean(),
  offersInPerson: z.boolean(),
})

export async function PATCH(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("تحقق من بيانات الممارسة.", 400)
  const result = await updateMyPracticeAction(parsed.data)
  if (!result.ok) return jsonError(result.error, 400)
  return jsonOk({ updated: true })
}
