"use server"

import { eq, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { aestheticCase, invoice, payment } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, forbidden, conflict } from "@/lib/errors"
import { appUrl } from "@/lib/env"
import { isStripeConfigured, createCheckoutSession } from "@/lib/payments/stripe"
import type { ActionResult } from "@/lib/actions/provider"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}

type FinalPaymentResult = { paymentConfigured: boolean; checkoutUrl?: string; amount: string }

/**
 * Patient pays the remaining balance on their invoice. The amount is ALWAYS the
 * server-computed `invoice.remainingAmount` — never a client-supplied value.
 */
export async function createFinalPayment(
  caseId: string,
): Promise<ActionResult<FinalPaymentResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PAYMENT_CREATE)

    const c = (
      await db
        .select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId, status: aestheticCase.status })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.patientUserId !== user.id) throw forbidden()

    const inv = (
      await db
        .select()
        .from(invoice)
        .where(eq(invoice.caseId, caseId))
        .orderBy(desc(invoice.createdAt))
        .limit(1)
    )[0]
    if (!inv) throw conflict("لا توجد فاتورة لهذه الحالة بعد.")
    const remaining = Number(inv.remainingAmount)
    if (remaining <= 0) throw conflict("لا يوجد رصيد متبقٍ على هذه الفاتورة.")
    if (!["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status))
      throw conflict("لا يمكن سداد هذه الفاتورة في حالتها الحالية.")

    // one pending final-payment attempt at a time
    const pendingExisting = (
      await db
        .select({ id: payment.id })
        .from(payment)
        .where(eq(payment.caseId, caseId))
        .orderBy(desc(payment.createdAt))
        .limit(1)
    )[0]
    if (pendingExisting) {
      const pRow = (await db.select().from(payment).where(eq(payment.id, pendingExisting.id)).limit(1))[0]
      if (pRow?.purpose === "FINAL_PAYMENT" && ["CREATED", "PENDING"].includes(pRow.status)) {
        throw conflict("توجد محاولة دفع سابقة قيد المعالجة. انتظر قليلًا أو أعد المحاولة لاحقًا.")
      }
    }

    const meta = await requestMeta()
    const amount = remaining.toFixed(2)

    const paymentId = await db.transaction(async (tx) => {
      const pay = await tx
        .insert(payment)
        .values({
          reference: ref("PAY"),
          purpose: "FINAL_PAYMENT",
          status: "CREATED",
          amount,
          currency: inv.currency,
          payerUserId: user.id,
          caseId,
          provider: "stripe",
        })
        .returning({ id: payment.id })
      await writeAudit(
        { action: "invoice.final_payment.create", actorUserId: user.id, entityType: "invoice", entityId: inv.id, metadata: { amount }, ...meta },
        tx,
      )
      return pay[0].id
    })

    if (!isStripeConfigured()) {
      return { ok: true, data: { paymentConfigured: false, amount } }
    }

    const checkout = await createCheckoutSession({
      paymentId,
      amount: remaining,
      currency: inv.currency,
      description: `سداد المتبقي — فاتورة ${inv.invoiceNumber}`,
      customerEmail: user.email,
      successUrl: `${appUrl()}/dashboard/cases/${caseId}?final_payment=1`,
      cancelUrl: `${appUrl()}/dashboard/cases/${caseId}?final_payment_canceled=1`,
    })
    await db.update(payment).set({ status: "PENDING", providerSessionId: checkout.id }).where(eq(payment.id, paymentId))

    return { ok: true, data: { paymentConfigured: true, checkoutUrl: checkout.url, amount } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
