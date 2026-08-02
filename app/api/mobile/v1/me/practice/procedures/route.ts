import { z } from "zod"
import { toggleMyProcedureAction } from "@/lib/actions/doctor"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const ToggleSchema = z.object({ procedureId: z.string().min(1), assign: z.boolean() })

/** Assign/unassign a procedure the signed-in doctor offers. Self-service
 *  equivalent of the admin Procedures tab — see toggleMyProcedureAction. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (auth.user.role !== "doctor") return jsonError("هذه الصفحة للأطباء فقط.", 403)

  const parsed = ToggleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  const result = await toggleMyProcedureAction(parsed.data)
  if (!result.ok) return jsonError(result.error, 400)
  return jsonOk({ updated: true })
}
