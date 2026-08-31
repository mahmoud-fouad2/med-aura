import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { promoCode, promoCodeRedemption } from "@/lib/db/schema"
import { validation } from "@/lib/errors"
import { toMinorUnits, fromMinorUnits } from "@/lib/money"

export type ResolvedPromo = {
  promoCodeId: string
  discountAmount: string
  finalAmount: string
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Validates a promo code against one specific charge, computes the
 * resulting discount, and atomically reserves a redemption slot — every
 * rule here (percentage/amount, limits, dates, minimum) is a row an admin
 * set from the dashboard, nothing hardcoded.
 *
 * Called inside the caller's own transaction (e.g. bookConsultation's) so
 * the redemption-count increment stays atomic with the booking itself: two
 * concurrent uses of a maxRedemptions:1 code can never both succeed, because
 * the UPDATE below only touches a row that still has room, and an empty
 * result means someone else just took the last slot.
 */
export async function resolvePromoCode(
  tx: Tx,
  input: { code: string; userId: string; amount: number; currency: string },
): Promise<ResolvedPromo> {
  const normalized = input.code.trim().toUpperCase()
  if (!normalized) throw validation("أدخل كود الخصم.")

  const promo = (
    await tx.select().from(promoCode).where(eq(promoCode.code, normalized)).limit(1)
  )[0]
  if (!promo || !promo.active) throw validation("كود الخصم غير صالح.")
  if (promo.restrictedToUserId && promo.restrictedToUserId !== input.userId) {
    throw validation("كود الخصم غير صالح.")
  }

  const now = new Date()
  if (promo.validFrom && now < promo.validFrom) throw validation("كود الخصم لم يبدأ سريانه بعد.")
  if (promo.validUntil && now > promo.validUntil) throw validation("انتهت صلاحية كود الخصم.")
  if (promo.minAmount && input.amount < Number(promo.minAmount)) {
    throw validation(`الحد الأدنى لاستخدام هذا الكود ${promo.minAmount} ${input.currency}.`)
  }
  if (promo.discountType === "FIXED" && promo.currency && promo.currency !== input.currency) {
    throw validation("كود الخصم غير متاح بهذه العملة.")
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    throw validation("تم استخدام كود الخصم بالكامل.")
  }

  const userRedemptions = (
    await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(promoCodeRedemption)
      .where(and(eq(promoCodeRedemption.promoCodeId, promo.id), eq(promoCodeRedemption.userId, input.userId)))
  )[0]?.n ?? 0
  if (userRedemptions >= promo.maxRedemptionsPerUser) {
    throw validation("لقد استخدمتِ هذا الكود من قبل.")
  }

  const amountMinor = toMinorUnits(input.amount)
  const discountMinor =
    promo.discountType === "PERCENTAGE"
      ? Math.min(amountMinor, Math.round((amountMinor * toMinorUnits(promo.discountValue)) / 10_000))
      : Math.min(amountMinor, toMinorUnits(promo.discountValue))
  const finalMinor = amountMinor - discountMinor
  // Stripe Checkout can't create a zero-total payment session — a code that
  // would fully zero out the charge is rejected rather than silently capped,
  // since capping it would misrepresent what the code actually offers.
  if (finalMinor <= 0) {
    throw validation("لا يمكن تطبيق هذا الكود — قيمة الخصم تساوي أو تتجاوز سعر الحجز.")
  }

  // Reserve the slot now (atomic re-check via the WHERE clause), not after
  // the booking commits — otherwise two concurrent requests could both read
  // "1 slot left" and both succeed.
  const reserved = await tx
    .update(promoCode)
    .set({ redemptionCount: sql`${promoCode.redemptionCount} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(promoCode.id, promo.id),
        promo.maxRedemptions !== null
          ? sql`${promoCode.redemptionCount} < ${promo.maxRedemptions}`
          : sql`true`,
      ),
    )
    .returning({ id: promoCode.id })
  if (reserved.length === 0) throw validation("تم استخدام كود الخصم بالكامل.")

  return {
    promoCodeId: promo.id,
    discountAmount: fromMinorUnits(discountMinor),
    finalAmount: fromMinorUnits(finalMinor),
  }
}
