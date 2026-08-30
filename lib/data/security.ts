import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { twoFactor, user } from "@/lib/db/schema"

export type TwoFactorStatus = {
  enabled: boolean
  /** A confirmed authenticator-app enrollment exists (verifyTotp succeeded). */
  totpVerified: boolean
  /** Email OTP needs no per-user setup — available the moment 2FA is on. */
  otpAvailable: boolean
}

/**
 * Session data alone can't distinguish "2FA on, email-only" from "2FA on,
 * authenticator app also confirmed" — that lives in the twoFactor table's own
 * `verified` flag, which Better Auth deliberately never returns to the
 * client (`returned: false` in its schema). This is the one place that reads
 * it, for the security settings page's own status display.
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const [userRow, twoFactorRow] = await Promise.all([
    db.select({ enabled: user.twoFactorEnabled }).from(user).where(eq(user.id, userId)).limit(1),
    db.select({ verified: twoFactor.verified }).from(twoFactor).where(eq(twoFactor.userId, userId)).limit(1),
  ])
  const enabled = userRow[0]?.enabled ?? false
  return {
    enabled,
    totpVerified: enabled && (twoFactorRow[0]?.verified ?? false),
    otpAvailable: enabled,
  }
}
