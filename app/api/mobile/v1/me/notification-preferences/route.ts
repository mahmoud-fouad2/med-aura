import { z } from "zod"
import { getPreferencesForCurrentUser, updateOffersPreferenceAction } from "@/lib/actions/notification-preferences"
import { jsonError, jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * Only the one preference the native app's Profile screen actually exposes
 * today (offers/marketing). The web dashboard's full channel preferences
 * (email/sms/whatsapp) aren't part of the mobile UI's model — see
 * lib/actions/notification-preferences.ts for the shared read/write logic.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const prefs = await getPreferencesForCurrentUser()
    return jsonOk({ offersEnabled: prefs.offersEnabled })
  } catch (err) {
    return jsonServerError("mobile.me.notification-preferences", err)
  }
}

const PatchSchema = z.object({ offersEnabled: z.boolean() })

export async function PATCH(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  const result = await updateOffersPreferenceAction(parsed.data.offersEnabled)
  if (result.status !== "ok") return jsonError(result.message ?? "تعذّر الحفظ.", 400)
  return jsonOk({ updated: true })
}
