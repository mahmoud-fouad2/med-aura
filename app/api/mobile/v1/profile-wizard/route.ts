import type { NextRequest } from "next/server"
import { saveProfileWizardDetails, skipProfileWizard } from "@/lib/actions/patient-profile"
import { jsonError, jsonOk, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

function statusFor(code: string): number {
  return code === "CONFLICT" ? 409 : code === "VALIDATION" ? 422 : code === "INTERNAL" ? 500 : 400
}

/** "Tell us about yourself" step — same validated action the web wizard uses. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await saveProfileWizardDetails(body)
    if (!result.ok) return jsonError(result.error, statusFor(result.code), result.code)
    return jsonOk({ saved: true })
  } catch (err) {
    return jsonServerError("mobile.profile-wizard", err, "تعذر حفظ البيانات. حاول مرة أخرى.")
  }
}

/** Explicit skip — still marks the wizard seen so it's a one-time prompt. */
export async function DELETE() {
  try {
    const result = await skipProfileWizard()
    if (!result.ok) return jsonError(result.error, statusFor(result.code), result.code)
    return jsonOk({ skipped: true })
  } catch (err) {
    return jsonServerError("mobile.profile-wizard", err, "تعذر تخطي الخطوة. حاول مرة أخرى.")
  }
}
