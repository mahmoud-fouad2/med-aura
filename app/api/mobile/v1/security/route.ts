import { getTwoFactorStatus } from "@/lib/data/security"
import { jsonOk, requireMobileUser, jsonServerError } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * The native security screen's status card. Better Auth's session payload
 * carries `user.twoFactorEnabled` already, but not whether the authenticator
 * app was actually verified (that flag is deliberately never returned by the
 * plugin — see lib/data/security.ts) — this is the one place mobile can read
 * it, same as the web dashboard's server component does directly.
 */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const status = await getTwoFactorStatus(auth.user.id)
    return jsonOk(status)
  } catch (err) {
    return jsonServerError("mobile.security", err)
  }
}
