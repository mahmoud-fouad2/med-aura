import { afterAll, describe, expect, it } from "vitest"
import { and, eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  patientProfile,
  promoCode,
  referral,
  referralSettings,
  user,
} from "@/lib/db/schema"
import {
  getOrCreateReferralCode,
  qualifyReferralIfApplicable,
} from "@/lib/referral"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const id = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("referral reward reliability", () => {
  const referrerId = id()
  const refereeId = id()
  const settingsId = id()

  afterAll(async () => {
    await db.delete(referral).where(eq(referral.refereeUserId, refereeId))
    await db
      .delete(promoCode)
      .where(inArray(promoCode.restrictedToUserId, [referrerId, refereeId]))
    await db.delete(patientProfile).where(inArray(patientProfile.userId, [referrerId, refereeId]))
    await db.delete(referralSettings).where(eq(referralSettings.id, settingsId))
    await db.delete(user).where(inArray(user.id, [referrerId, refereeId]))
    await pool.end()
  })

  it("assigns one stable code and issues each reward exactly once under concurrency", async () => {
    await db.insert(user).values([
      { id: referrerId, name: "Referrer", email: `referrer-${referrerId}@t.local` },
      { id: refereeId, name: "Referee", email: `referee-${refereeId}@t.local` },
    ])
    // The user insert path creates the baseline patient profile in this
    // schema, matching a real public sign-up.
    await db.insert(referralSettings).values({
      id: settingsId,
      active: true,
      referrerRewardType: "FIXED",
      referrerRewardValue: "40.00",
      refereeRewardType: "PERCENTAGE",
      refereeRewardValue: "10.00",
      currency: "SAR",
      rewardValidDays: 30,
      updatedAt: new Date("2099-01-01T00:00:00.000Z"),
    })

    const codes = await Promise.all([
      getOrCreateReferralCode(referrerId),
      getOrCreateReferralCode(referrerId),
    ])
    expect(codes[0]).toBe(codes[1])

    await db.insert(referral).values({
      referrerUserId: referrerId,
      refereeUserId: refereeId,
    })

    await Promise.all([
      qualifyReferralIfApplicable(refereeId, "appointment-a"),
      qualifyReferralIfApplicable(refereeId, "appointment-b"),
    ])

    const linked = (
      await db
        .select()
        .from(referral)
        .where(eq(referral.refereeUserId, refereeId))
        .limit(1)
    )[0]
    expect(linked.status).toBe("REWARDED")
    expect(linked.referrerRewardPromoCodeId).toBeTruthy()
    expect(linked.refereeRewardPromoCodeId).toBeTruthy()

    const rewards = await db
      .select({ id: promoCode.id, owner: promoCode.restrictedToUserId })
      .from(promoCode)
      .where(
        and(
          inArray(promoCode.restrictedToUserId, [referrerId, refereeId]),
          inArray(promoCode.id, [
            linked.referrerRewardPromoCodeId!,
            linked.refereeRewardPromoCodeId!,
          ]),
        ),
      )
    expect(rewards).toHaveLength(2)
    expect(new Set(rewards.map((reward) => reward.owner))).toEqual(
      new Set([referrerId, refereeId]),
    )
  }, 20_000)

  it("rejects self-referrals at the database boundary", async () => {
    await expect(
      db.insert(referral).values({
        referrerUserId: referrerId,
        refereeUserId: referrerId,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } })
  })
})
