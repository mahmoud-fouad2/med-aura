import type { NextRequest } from "next/server"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * Same validated + audited profile completion the web signup uses —
 * the action already enforces session, ownership, and validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await completeSignupProfile(body)
    if (!result.ok) return jsonError(result.error, 400)
    return jsonOk({ next: result.next })
  } catch {
    return jsonError("تعذر حفظ البيانات. حاول مرة أخرى.", 500)
  }
}
