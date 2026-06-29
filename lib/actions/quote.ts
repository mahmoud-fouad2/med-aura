"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  doctorProfile,
  treatmentPlan,
  quote,
  quoteItem,
  quoteStatusHistory,
  payment,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasRole, PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { assertCaseTransition, type CaseStatus } from "@/lib/domain/case-state-machine"
import { appUrl } from "@/lib/env"
import { isStripeConfigured, createCheckoutSession } from "@/lib/payments/stripe"
import type { ActionResult } from "@/lib/actions/provider"

function ref(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`
}
const money = (n: number) => n.toFixed(2)

const itemSchema = z.object({
  category: z.enum([
    "DOCTOR_FEE", "CENTER_FEE", "OPERATING_ROOM", "ANESTHESIA", "LAB_TESTS",
    "MEDICATIONS", "MEDICAL_GARMENT", "HOSPITAL_STAY", "FOLLOW_UP",
    "TRANSPORT", "HOTEL", "TRANSLATION", "OTHER",
  ]),
  descriptionAr: z.string().min(1, "وصف البند مطلوب").max(300),
  quantity: z.coerce.number().int().min(1).max(999),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
})

const quoteSchema = z.object({
  caseId: z.string().min(1),
  currency: z.string().default("SAR"),
  items: z.array(itemSchema).min(1, "أضف بندًا واحدًا على الأقل"),
  discount: z.coerce.number().min(0).optional().default(0),
  depositPercent: z.coerce.number().min(0).max(100).optional().default(25),
  expiryDays: z.coerce.number().int().min(1).max(120).optional().default(14),
  includedItems: z.string().max(2000).optional().default(""),
  excludedItems: z.string().max(2000).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
})

async function assertCanPriceCase(userId: string, caseDoctorId: string | null) {
  // The case doctor (often also the center owner) or a super admin may price.
  if (caseDoctorId) {
    const doc = (
      await db
        .select({ userId: doctorProfile.userId })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, caseDoctorId))
        .limit(1)
    )[0]
    if (doc?.userId === userId) return
  }
  if (await hasRole(userId, ROLES.SUPER_ADMIN)) return
  throw forbidden()
}

/** Center/doctor issues a detailed quote (totals computed server-side). */
export async function createQuote(
  input: unknown,
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.QUOTE_WRITE)
    const parsed = quoteSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const caseRow = (
      await db
        .select({
          id: aestheticCase.id,
          status: aestheticCase.status,
          doctorId: aestheticCase.doctorId,
          centerId: aestheticCase.centerId,
          patientUserId: aestheticCase.patientUserId,
        })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!caseRow) throw new AppError("NOT_FOUND")
    await assertCanPriceCase(user.id, caseRow.doctorId)

    if (caseRow.status !== "TREATMENT_PLAN_ISSUED")
      throw conflict("لا يمكن إصدار عرض سعر دون خطة علاجية منشورة.")

    const plan = (
      await db
        .select({ id: treatmentPlan.id })
        .from(treatmentPlan)
        .where(eq(treatmentPlan.caseId, data.caseId))
        .limit(1)
    )[0]

    // ── server-side totals (never trust client) ──
    let subtotal = 0
    let tax = 0
    const computed = data.items.map((it, i) => {
      const line = it.quantity * it.unitPrice
      const lineTax = (line * it.taxRate) / 100
      subtotal += line
      tax += lineTax
      return {
        category: it.category,
        descriptionAr: it.descriptionAr,
        quantity: it.quantity,
        unitPrice: money(it.unitPrice),
        taxRate: money(it.taxRate),
        total: money(line + lineTax),
        sortOrder: i,
      }
    })
    const discount = Math.min(data.discount, subtotal)
    const total = Math.max(0, subtotal + tax - discount)
    const depositRequired = Math.round((total * data.depositPercent) / 100 * 100) / 100
    const remaining = Math.max(0, total - depositRequired)
    const expiry = new Date(Date.now() + data.expiryDays * 86400_000)

    const quoteId = await db.transaction(async (tx) => {
      const q = await tx
        .insert(quote)
        .values({
          quoteNumber: ref("QT"),
          caseId: data.caseId,
          treatmentPlanId: plan?.id,
          patientUserId: caseRow.patientUserId,
          doctorId: caseRow.doctorId,
          centerId: caseRow.centerId,
          currency: data.currency,
          expiryDate: expiry,
          subtotal: money(subtotal),
          discount: money(discount),
          tax: money(tax),
          total: money(total),
          depositRequired: money(depositRequired),
          remainingBalance: money(remaining),
          includedItems: data.includedItems,
          excludedItems: data.excludedItems,
          notes: data.notes,
          status: "SENT",
          createdBy: user.id,
        })
        .returning({ id: quote.id })
      const newQuoteId = q[0].id

      for (const c of computed) {
        await tx.insert(quoteItem).values({ quoteId: newQuoteId, ...c })
      }
      await tx.insert(quoteStatusHistory).values({
        quoteId: newQuoteId,
        toStatus: "SENT",
        changedBy: user.id,
      })

      assertCaseTransition(caseRow.status as CaseStatus, "QUOTE_ISSUED")
      await tx
        .update(aestheticCase)
        .set({ status: "QUOTE_ISSUED", updatedBy: user.id })
        .where(eq(aestheticCase.id, caseRow.id))
      await tx.insert(caseStatusHistory).values({
        caseId: caseRow.id,
        fromStatus: caseRow.status,
        toStatus: "QUOTE_ISSUED",
        changedBy: user.id,
      })
      await writeAudit(
        {
          action: "quote.create",
          actorUserId: user.id,
          entityType: "quote",
          entityId: newQuoteId,
          metadata: { caseId: caseRow.id, total: money(total) },
        },
        tx,
      )
      return newQuoteId
    })

    await notify({
      userId: caseRow.patientUserId,
      type: "quote.sent",
      title: "وصلك عرض سعر",
      body: "أصدر المركز عرض سعر لحالتك. راجع البنود واقبل العرض للمتابعة.",
      caseId: caseRow.id,
      href: `/dashboard/cases/${caseRow.id}`,
    })

    revalidatePath(`/dashboard/cases/${data.caseId}`)
    return { ok: true, data: { quoteId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Patient opening the quote marks it VIEWED (best-effort, owner only). */
export async function markQuoteViewed(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const q = (
      await db
        .select({ id: quote.id, status: quote.status, patientUserId: quote.patientUserId })
        .from(quote)
        .where(eq(quote.id, quoteId))
        .limit(1)
    )[0]
    if (!q || q.patientUserId !== user.id) return { ok: true }
    if (q.status === "SENT") {
      await db
        .update(quote)
        .set({ status: "VIEWED", viewedAt: new Date() })
        .where(eq(quote.id, quoteId))
      await db.insert(quoteStatusHistory).values({
        quoteId,
        fromStatus: "SENT",
        toStatus: "VIEWED",
        changedBy: user.id,
      })
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

type AcceptResult = { paymentConfigured: boolean; checkoutUrl?: string }

/** Patient accepts the quote → QUOTE_ACCEPTED + creates a deposit checkout. */
export async function acceptQuote(
  quoteId: string,
): Promise<ActionResult<AcceptResult>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PAYMENT_CREATE)

    const q = (
      await db.select().from(quote).where(eq(quote.id, quoteId)).limit(1)
    )[0]
    if (!q) throw new AppError("NOT_FOUND")
    if (q.patientUserId !== user.id) throw forbidden()
    if (["ACCEPTED"].includes(q.status))
      throw conflict("سبق أن قبلت هذا العرض.")
    if (!["SENT", "VIEWED"].includes(q.status))
      throw conflict("هذا العرض لم يعد متاحًا للقبول.")
    if (q.expiryDate && new Date(q.expiryDate).getTime() < Date.now())
      throw conflict("انتهت صلاحية هذا العرض، اطلب عرضًا محدّثًا.")

    const caseRow = (
      await db
        .select({ id: aestheticCase.id, status: aestheticCase.status })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, q.caseId))
        .limit(1)
    )[0]
    if (!caseRow) throw new AppError("NOT_FOUND")

    const meta = await requestMeta()
    const payRef = ref("PAY")

    const paymentId = await db.transaction(async (tx) => {
      await tx
        .update(quote)
        .set({
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedIp: meta.ip,
          acceptedUserAgent: meta.userAgent,
          updatedBy: user.id,
        })
        .where(eq(quote.id, quoteId))
      await tx.insert(quoteStatusHistory).values({
        quoteId,
        fromStatus: q.status,
        toStatus: "ACCEPTED",
        changedBy: user.id,
      })

      assertCaseTransition(caseRow.status as CaseStatus, "QUOTE_ACCEPTED")
      await tx
        .update(aestheticCase)
        .set({ status: "QUOTE_ACCEPTED", updatedBy: user.id })
        .where(eq(aestheticCase.id, caseRow.id))
      await tx.insert(caseStatusHistory).values({
        caseId: caseRow.id,
        fromStatus: caseRow.status,
        toStatus: "QUOTE_ACCEPTED",
        changedBy: user.id,
      })

      const pay = await tx
        .insert(payment)
        .values({
          reference: payRef,
          purpose: "DEPOSIT",
          status: "CREATED",
          amount: q.depositRequired,
          currency: q.currency,
          payerUserId: user.id,
          caseId: q.caseId,
          provider: "stripe",
        })
        .returning({ id: payment.id })

      await writeAudit(
        {
          action: "quote.accept",
          actorUserId: user.id,
          entityType: "quote",
          entityId: quoteId,
          metadata: { caseId: caseRow.id, deposit: q.depositRequired },
          ...meta,
        },
        tx,
      )
      return pay[0].id
    })

    if (!isStripeConfigured()) {
      return { ok: true, data: { paymentConfigured: false } }
    }

    const checkout = await createCheckoutSession({
      paymentId,
      amount: Number(q.depositRequired),
      currency: q.currency,
      description: `عربون — عرض ${q.quoteNumber}`,
      customerEmail: user.email,
      successUrl: `${appUrl()}/dashboard/cases/${q.caseId}?deposit=1`,
      cancelUrl: `${appUrl()}/dashboard/cases/${q.caseId}?deposit_canceled=1`,
    })
    await db
      .update(payment)
      .set({ status: "PENDING", providerSessionId: checkout.id })
      .where(eq(payment.id, paymentId))

    return { ok: true, data: { paymentConfigured: true, checkoutUrl: checkout.url } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
