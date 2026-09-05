import { z } from "zod"
import {
  cancelAppointment,
  markAppointmentNoShow,
  rescheduleMissedAppointment,
} from "@/lib/actions/appointments"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_no_show") }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("reschedule_after_no_show"),
    startsAt: z.string().datetime(),
  }),
])

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  const { id } = await context.params

  const result =
    parsed.data.action === "mark_no_show"
      ? await markAppointmentNoShow(id)
      : parsed.data.action === "cancel"
        ? await cancelAppointment({ appointmentId: id, reason: parsed.data.reason })
        : await rescheduleMissedAppointment({
            appointmentId: id,
            startsAt: parsed.data.startsAt,
          })
  if (!result.ok) {
    const status =
      result.code === "FORBIDDEN"
        ? 403
        : result.code === "NOT_FOUND"
          ? 404
          : 409
    return jsonError(result.error, status)
  }
  return jsonOk(result.data ?? { updated: true })
}