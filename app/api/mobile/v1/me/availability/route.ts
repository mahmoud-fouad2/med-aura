import { z } from "zod"
import {
  getMyAvailabilityAction,
  upsertMyAvailabilityRuleAction,
  deleteMyAvailabilityRuleAction,
} from "@/lib/actions/doctor"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * A doctor's own weekly availability rules — self-service, mirroring
 * /api/mobile/v1/me/practice's shape. All three verbs delegate straight to
 * lib/actions/doctor.ts's self-service actions, the exact same ones the web
 * editor at /dashboard/doctor/availability uses — no logic duplicated here.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  const result = await getMyAvailabilityAction()
  if (result.status === "error") return jsonError(result.message, 400)
  return jsonOk({ rules: result.rules })
}

const UpsertSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  slotMinutes: z.number().int().min(5).max(240),
  type: z.enum(["VIDEO_CONSULTATION", "IN_PERSON_CONSULTATION"]),
  active: z.boolean(),
})

/** Create (no id) or update (id present) one weekly availability rule. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  const parsed = UpsertSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("تحقق من بيانات الوقت.", 400)
  const result = await upsertMyAvailabilityRuleAction(parsed.data)
  if (!result.ok) return jsonError(result.error, 400)
  return jsonOk({ updated: true })
}

const DeleteSchema = z.object({ id: z.string().min(1) })

export async function DELETE(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  const result = await deleteMyAvailabilityRuleAction(parsed.data)
  if (!result.ok) return jsonError(result.error, 400)
  return jsonOk({ deleted: true })
}
