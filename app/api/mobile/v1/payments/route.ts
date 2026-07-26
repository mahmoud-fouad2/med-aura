import { listMyPayments } from "@/lib/data/invoice"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * The signed-in user's own payment/billing history. Always scoped to
 * `payerUserId` — never another user's data, regardless of role — so no
 * separate permission check is needed beyond being signed in.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const rows = await listMyPayments(auth.user.id)
    return jsonOk({ payments: rows })
  } catch {
    return jsonError("تعذر تحميل البيانات. حاول مرة أخرى.", 500)
  }
}
