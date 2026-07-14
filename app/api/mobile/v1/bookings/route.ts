import type { NextRequest } from "next/server"
import { z } from "zod"
import { bookConsultation } from "@/lib/actions/booking"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const BodySchema = z.object({
  doctorId: z.string().min(1),
  startsAt: z.string().min(10),
  type: z.enum(["VIDEO_CONSULTATION", "IN_PERSON_CONSULTATION"]).optional(),
})

/**
 * Books a consultation for the signed-in patient. Delegates to the same
 * action the web uses (session + RBAC + no-double-booking + audit + Stripe).
 * Never reports success before the server confirms.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) return jsonError("تحقق من بيانات الحجز.", 400)
    const result = await bookConsultation(parsed.data)
    if (!result.ok) {
      // 401 lets the app route the user to sign-in; anything else is a
      // booking-level failure (slot taken, validation) shown in place.
      const status = result.code === "UNAUTHORIZED" ? 401 : 409
      return jsonError(result.error, status)
    }
    return jsonOk(result.data)
  } catch {
    return jsonError("تعذر إتمام الحجز. حاول مرة أخرى.", 500)
  }
}
