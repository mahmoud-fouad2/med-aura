import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile, promoCode, referral, referralSettings, user as userT } from "@/lib/db/schema"
import { notify } from "@/lib/notifications"
import { logger } from "@/lib/logger"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbOrTx = typeof db | Tx

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I — avoids ambiguous entry

function randomCode(length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return out
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
      .select({ referralCode: patientProfile.referralCode })
      .from(patientProfile)
      .where(eq(patientProfile.userId, userId))
      .limit(1)
  )[0]
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6)
    try {
      await db.insert(patientProfile).values({ userId, referralCode: code }).onConflictDoUpdate({
        target: patientProfile.userId,
        set: { referralCode: code },
      })
      return code
    } catch {
      // unique collision on referralCode itself — retry with a fresh one
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
  } catch {
    // referee already has a referral row (unique index) — first code wins, ignore.
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
    const settings = await getActiveReferralSettings()
    if (!settings) return

    const pending = (
      await db
        .select()
        .from(referral)
        .where(and(eq(referral.refereeUserId, refereeUserId), eq(referral.status, "PENDING")))
        .limit(1)
    )[0]
    if (!pending) return

    const [referrerRow, refereeRow] = await Promise.all([
      db.select({ name: userT.name }).from(userT).where(eq(userT.id, pending.referrerUserId)).limit(1),
      db.select({ name: userT.name }).from(userT).where(eq(userT.id, refereeUserId)).limit(1),
    ])

    const validUntil = new Date(Date.now() + settings.rewardValidDays * 24 * 60 * 60 * 1000)

    const referrerPromo = await createRewardPromoCode({
      userId: pending.referrerUserId,
      type: settings.referrerRewardType,
      value: settings.referrerRewardValue,
      currency: settings.currency,
      validUntil,
      description: `مكافأة دعوة صديق — ${refereeRow[0]?.name ?? "مستخدم جديد"}`,
    })
    const refereePromo = await createRewardPromoCode({
      userId: refereeUserId,
      type: settings.refereeRewardType,
      value: settings.refereeRewardValue,
      currency: settings.currency,
      validUntil,
      description: `مكافأة الترحيب بالدعوة — ${referrerRow[0]?.name ?? ""}`,
    })

    await db
      .update(referral)
      .set({
        status: "REWARDED",
        qualifyingAppointmentId: appointmentId,
        referrerRewardPromoCodeId: referrerPromo.id,
        refereeRewardPromoCodeId: refereePromo.id,
        qualifiedAt: new Date(),
      })
      .where(eq(referral.id, pending.id))

    await Promise.all([
      notify({
        userId: pending.referrerUserId,
        type: "referral.rewarded",
        title: "حصلتِ على مكافأة دعوة صديقة",
        body: `استخدم صديقك المدعو كود الدعوة وأتم أول استشارة — كود المكافأة: ${referrerPromo.code}`,
        href: "/dashboard/referral",
      }),
      notify({
        userId: refereeUserId,
        type: "referral.rewarded",
        title: "مكافأة ترحيبية بانتظارك",
        body: `شكرًا لاستخدام كود الدعوة — كود المكافأة: ${refereePromo.code}`,
        href: "/dashboard/referral",
      }),
    ])
  } catch (err) {
    logger.error("referral.qualify failed", { err: err instanceof Error ? err.message : String(err) })
  }
}

async function createRewardPromoCode(input: {
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
        await db
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
    } catch {
      continue // unique collision on code — retry with a fresh one
    }
  }
  throw new Error("تعذر إنشاء كود المكافأة.")
}
