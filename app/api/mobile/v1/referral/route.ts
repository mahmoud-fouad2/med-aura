import { getMyReferralAction } from "@/lib/actions/referral"
import { jsonError, jsonOk, jsonServerError, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** The signed-in patient's own referral code, share link, and simple stats. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const result = await getMyReferralAction()
    if (result.status === "error") return jsonError(result.message, 500)
    return jsonOk(result.data)
  } catch (err) {
    return jsonServerError("mobile.referral", err)
  }
}
