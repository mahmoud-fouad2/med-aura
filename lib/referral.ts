import { randomInt } from "node:crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile, promoCode, referral, referralSettings, user as userT } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"
import { logger } from "@/lib/logger"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbOrTx = typeof db | Tx

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I — avoids ambiguous entry

function randomCode(length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined
  const direct = "code" in error && typeof error.code === "string" ? error.code : undefined
  if (direct) return direct
  const cause = "cause" in error ? error.cause : undefined
  return cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string"
    ? cause.code
    : undefined
}

/** The current admin-configured settings row, or null if none exists yet
 *  (the feature has never been configured) or it's explicitly turned off. */
export async function getActiveReferralSettings(dbc: DbOrTx = db) {
  const row = (
    await dbc.select().from(referralSettings).orderBy(desc(referralSettings.updatedAt)).limit(1)
  )[0]
  if (!row || !row.active) return null
  return row
}

/** A patient's own shareable code — generated once, on first request. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = (
    await db
      .select({ id: patientProfile.id, referralCode: patientProfile.referralCode })
      .from(patientProfile)
      .where(eq(patientProfile.userId, userId))
      .limit(1)
  )[0]
  if (!existing) throw new Error("Patient profile is required for referrals")
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6)
    try {
      const updated = await db
        .update(patientProfile)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(and(eq(patientProfile.id, existing.id), isNull(patientProfile.referralCode)))
        .returning({ referralCode: patientProfile.referralCode })
      if (updated[0]?.referralCode) return updated[0].referralCode

      // Another request may have assigned the code while this one waited.
      const winner = (
        await db
          .select({ referralCode: patientProfile.referralCode })
          .from(patientProfile)
          .where(eq(patientProfile.id, existing.id))
          .limit(1)
      )[0]?.referralCode
      if (winner) return winner
    } catch (error) {
      if (databaseErrorCode(error) !== "23505") throw error
      // Unique collision on referralCode itself — retry with a fresh code.
      continue
    }
  }
  throw new Error("تعذر إنشاء كود الدعوة. حاول مرة أخرى.")
}

/**
 * Links a brand-new patient to whoever referred them — called once, at
 * signup completion (see lib/actions/onboarding.ts / patient-profile.ts).
 * Silently no-ops on any invalid/self-referral/already-linked case: a bad
 * or missing code must never block signup.
 */
export async function linkReferral(dbc: DbOrTx, refereeUserId: string, rawCode: string | null | undefined) {
  const code = rawCode?.trim().toUpperCase()
  if (!code) return

  const settings = await getActiveReferralSettings(dbc)
  if (!settings) return

  const referrer = (
    await dbc
      .select({ userId: patientProfile.userId })
      .from(patientProfile)
      .where(eq(patientProfile.referralCode, code))
      .limit(1)
  )[0]
  if (!referrer || referrer.userId === refereeUserId) return

  try {
    await dbc.insert(referral).values({ referrerUserId: referrer.userId, refereeUserId })
  } catch (error) {
    // Referee already has a referral row (unique index) — first code wins.
    if (databaseErrorCode(error) !== "23505") throw error
  }
}

/**
 * Qualifies a referral once the referee's first consultation payment
 * succeeds, and immediately issues both reward promo codes. Deliberately
 * called AFTER the payment webhook's own transaction commits (see
 * app/api/webhooks/stripe/route.ts) — a bug here must never be able to roll
 * back a real, already-successful payment confirmation. Never throws.
 */
export async function qualifyReferralIfApplicable(refereeUserId: string, appointmentId: string): Promise<void> {
  try {
    const reward = await db.transaction(async (tx) => {
      const settings = await getActiveReferralSettings(tx)
      if (!settings) return null

      // This conditional update is the concurrency gate. Exactly one webhook
      // delivery can claim a pending referral; all others receive no row.
      const claimed = (
        await tx
          .update(referral)
          .set({ status: "QUALIFIED", qualifyingAppointmentId: appointmentId })
          .where(and(eq(referral.refereeUserId, refereeUserId), eq(referral.status, "PENDING")))
          .returning()
      )[0]
      if (!claimed) return null

      const referrerRow = await tx
        .select({ name: userT.name })
        .from(userT)
        .where(eq(userT.id, claimed.referrerUserId))
        .limit(1)
      const refereeRow = await tx
        .select({ name: userT.name })
        .from(userT)
        .where(eq(userT.id, refereeUserId))
        .limit(1)
      const validUntil = new Date(Date.now() + settings.rewardValidDays * 24 * 60 * 60 * 1000)

      const referrerPromo = await createRewardPromoCode(tx, {
        userId: claimed.referrerUserId,
        type: settings.referrerRewardType,
        value: settings.referrerRewardValue,
        currency: settings.currency,
        validUntil,
        description: `مكافأة دعوة صديق — ${refereeRow[0]?.name ?? "مستخدم جديد"}`,
      })
      const refereePromo = await createRewardPromoCode(tx, {
        userId: refereeUserId,
        type: settings.refereeRewardType,
        value: settings.refereeRewardValue,
        currency: settings.currency,
        validUntil,
        description: `مكافأة الترحيب بالدعوة — ${referrerRow[0]?.name ?? ""}`,
      })

      await tx
        .update(referral)
        .set({
          status: "REWARDED",
          referrerRewardPromoCodeId: referrerPromo.id,
          refereeRewardPromoCodeId: refereePromo.id,
          qualifiedAt: new Date(),
        })
        .where(and(eq(referral.id, claimed.id), eq(referral.status, "QUALIFIED")))

      return {
        referrerUserId: claimed.referrerUserId,
        referrerPromoCode: referrerPromo.code,
        refereePromoCode: refereePromo.code,
      }
    })
    if (!reward) return

    const notifications = await Promise.allSettled([
      notify({
        userId: reward.referrerUserId,
        type: "referral.rewarded",
        title: "حصلتِ على مكافأة دعوة صديقة",
        body: `استخدم صديقك المدعو كود الدعوة وأتم أول استشارة — كود المكافأة: ${reward.referrerPromoCode}`,
        href: "/dashboard/referral",
      }),
      notify({
        userId: refereeUserId,
        type: "referral.rewarded",
        title: "مكافأة ترحيبية بانتظارك",
        body: `شكرًا لاستخدام كود الدعوة — كود المكافأة: ${reward.refereePromoCode}`,
        href: "/dashboard/referral",
      }),
    ])
    if (notifications.some((result) => result.status === "rejected")) {
      logger.warn("referral.reward notification failed", { refereeUserId })
    }
  } catch (err) {
    logger.error("referral.qualify failed", { err: err instanceof Error ? err.message : String(err) })
  }
}

async function createRewardPromoCode(dbc: DbOrTx, input: {
  userId: string
  type: "PERCENTAGE" | "FIXED"
  value: string
  currency: string
  validUntil: Date
  description: string
}): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `REF-${randomCode(8)}`
    try {
      const row = (
        await dbc
          .insert(promoCode)
          .values({
            code,
            description: input.description,
            discountType: input.type,
            discountValue: input.value,
            currency: input.type === "FIXED" ? input.currency : null,
            maxRedemptions: 1,
            maxRedemptionsPerUser: 1,
            validUntil: input.validUntil,
            active: true,
            restrictedToUserId: input.userId,
          })
          .returning({ id: promoCode.id, code: promoCode.code })
      )[0]
      if (row) return row
    } catch (error) {
      if (databaseErrorCode(error) !== "23505") throw error
      continue // Unique collision on code — retry with a fresh one.
    }
  }
  throw new Error("تعذر إنشاء كود المكافأة.")
}
