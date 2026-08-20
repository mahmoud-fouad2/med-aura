import type { NextRequest } from "next/server"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { jsonError, jsonOk, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * Same validated + audited profile completion the web signup uses —
 * the action already enforces session, ownership, and validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await completeSignupProfile(body)
    if (!result.ok) {
      const status = result.code === "CONFLICT" ? 409 : result.code === "INTERNAL" ? 500 : 422
      return jsonError(result.error, status, result.code)
    }
    return jsonOk({ next: result.next })
  } catch (err) {
    return jsonServerError("mobile.signup-profile", err, "تعذر حفظ البيانات. حاول مرة أخرى.")
  }
}
