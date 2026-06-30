"use server"

import { z } from "zod"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  doctorProfile,
  medicalApproval,
  procedureBooking,
  procedureBookingHistory,
  procedureRecord,
  quote,
  quoteItem,
  invoice,
  invoiceItem,
  followUpPlan,
  followUpTask,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { assertCaseTransition, type CaseStatus } from "@/lib/domain/case-state-machine"
import type { ActionResult } from "@/lib/actions/provider"

const ref = (p: string) => `${p}-${crypto.randomUUID().replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase()}`

async function caseDoctorGuard(userId: string, caseDoctorId: string | null) {
  if (!caseDoctorId) throw forbidden()
  const doc = (
    await db.select({ userId: doctorProfile.userId }).from(doctorProfile).where(eq(doctorProfile.id, caseDoctorId)).limit(1)
  )[0]
  if (!doc || doc.userId !== userId) throw forbidden()
}
async function loadCase(caseId: string) {
  const c = (
    await db
      .select({
        id: aestheticCase.id,
        status: aestheticCase.status,
        doctorId: aestheticCase.doctorId,
        centerId: aestheticCase.centerId,
        patientUserId: aestheticCase.patientUserId,
      })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, caseId))
      .limit(1)
  )[0]
  if (!c) throw new AppError("NOT_FOUND")
  return c
}
async function setCaseStatus(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  caseId: string,
  from: string,
  to: CaseStatus,
  userId: string,
  note?: string,
) {
  assertCaseTransition(from as CaseStatus, to)
  await tx.update(aestheticCase).set({ status: to, updatedBy: userId }).where(eq(aestheticCase.id, caseId))
  await tx.insert(caseStatusHistory).values({ caseId, fromStatus: from as CaseStatus, toStatus: to, changedBy: userId, note })
}

/* ── 1) Medical approval (doctor) ─────────────────────────────────────────── */
const approveSchema = z.object({
  caseId: z.string().min(1),
  finalAssessment: z.string().max(4000).optional().default(""),
  conditions: z.string().max(2000).optional().default(""),
  requiredTestsCompleted: z.boolean().optional().default(true),
})

export async function medicalApprove(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.MEDICAL_APPROVE)
    const data = approveSchema.parse(input)
    const c = await loadCase(data.caseId)
    await caseDoctorGuard(user.id, c.doctorId)
    if (c.status !== "DEPOSIT_PAID")
      throw conflict("لا يمكن الاعتماد الطبي قبل دفع العربون.")
    if (!data.requiredTestsCompleted)
      throw validation("يجب استكمال المتطلبات قبل الاعتماد.")

    await db.transaction(async (tx) => {
      await tx.insert(medicalApproval).values({
        caseId: c.id,
        doctorId: c.doctorId!,
        status: "APPROVED",
        requiredTestsCompleted: true,
        documentsReviewed: true,
        finalAssessment: data.finalAssessment,
        conditions: data.conditions,
        approvedAt: new Date(),
        createdBy: user.id,
      })
      // advance the procedure booking to await center confirmation
      const booking = (
        await tx.select({ id: procedureBooking.id, status: procedureBooking.status }).from(procedureBooking).where(eq(procedureBooking.caseId, c.id)).limit(1)
      )[0]
      if (booking && booking.status === "PENDING_MEDICAL_APPROVAL") {
        await tx.update(procedureBooking).set({ status: "PENDING_CENTER_CONFIRMATION" }).where(eq(procedureBooking.id, booking.id))
        await tx.insert(procedureBookingHistory).values({
          procedureBookingId: booking.id,
          fromStatus: "PENDING_MEDICAL_APPROVAL",
          toStatus: "PENDING_CENTER_CONFIRMATION",
          changedBy: user.id,
        })
      }
      await setCaseStatus(tx, c.id, c.status, "MEDICALLY_APPROVED", user.id, "اعتماد طبي")
      await writeAudit({ action: "medical.approve", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "medical.approved",
      title: "تم الاعتماد الطبي لحالتك",
      body: "اعتمد طبيبك حالتك طبيًا. سيقوم المركز بتأكيد موعد الإجراء.",
      caseId: c.id,
      href: `/dashboard/cases/${c.id}`,
    })
    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 2) Center confirms date ──────────────────────────────────────────────── */
const centerSchema = z.object({
  caseId: z.string().min(1),
  scheduledDate: z.string().min(4, "حدد تاريخ الإجراء"),
  operatingRoom: z.string().max(120).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
})

export async function centerConfirmProcedure(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROCEDURE_CONFIRM)
    const data = centerSchema.parse(input)
    const c = await loadCase(data.caseId)
    if (c.status !== "MEDICALLY_APPROVED")
      throw conflict("لا يمكن تأكيد المركز قبل الاعتماد الطبي.")

    await db.transaction(async (tx) => {
      const booking = (
        await tx.select({ id: procedureBooking.id, status: procedureBooking.status }).from(procedureBooking).where(eq(procedureBooking.caseId, c.id)).limit(1)
      )[0]
      if (!booking) throw conflict("لا يوجد حجز إجراء لهذه الحالة.")
      await tx
        .update(procedureBooking)
        .set({
          status: "PENDING_PATIENT_REQUIREMENTS",
          scheduledDate: data.scheduledDate,
          operatingRoom: data.operatingRoom || null,
          centerConfirmationNotes: data.notes || null,
          updatedBy: user.id,
        })
        .where(eq(procedureBooking.id, booking.id))
      await tx.insert(procedureBookingHistory).values({
        procedureBookingId: booking.id,
        fromStatus: booking.status,
        toStatus: "PENDING_PATIENT_REQUIREMENTS",
        changedBy: user.id,
        note: `تاريخ مقترح: ${data.scheduledDate}`,
      })
      await setCaseStatus(tx, c.id, c.status, "CENTER_CONFIRMED", user.id, "اعتماد المركز للتاريخ")
      await writeAudit({ action: "center.confirm", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id, metadata: { scheduledDate: data.scheduledDate } }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "center.confirmed",
      title: "أكّد المركز موعد إجرائك",
      body: `الموعد المقترح: ${data.scheduledDate}. يرجى الإقرار بتعليمات ما قبل الإجراء لتأكيده نهائيًا.`,
      caseId: c.id,
      href: `/dashboard/cases/${c.id}`,
    })
    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 3) Patient acknowledges instructions → PROCEDURE_CONFIRMED ────────────── */
export async function patientConfirmProcedure(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const c = await loadCase(caseId)
    if (c.patientUserId !== user.id) throw forbidden()
    if (c.status !== "CENTER_CONFIRMED")
      throw conflict("لا يمكن تأكيد الإجراء في هذه المرحلة.")

    // verify all gating conditions server-side
    const approval = (
      await db.select({ status: medicalApproval.status }).from(medicalApproval).where(eq(medicalApproval.caseId, caseId)).orderBy(desc(medicalApproval.createdAt)).limit(1)
    )[0]
    if (!approval || approval.status !== "APPROVED")
      throw conflict("لا يوجد اعتماد طبي ساري.")
    const acceptedQuote = (
      await db.select({ id: quote.id, status: quote.status }).from(quote).where(eq(quote.caseId, caseId)).orderBy(desc(quote.createdAt)).limit(1)
    )[0]
    if (!acceptedQuote || acceptedQuote.status !== "ACCEPTED")
      throw conflict("عرض السعر غير مقبول.")

    await db.transaction(async (tx) => {
      const booking = (
        await tx.select({ id: procedureBooking.id, status: procedureBooking.status }).from(procedureBooking).where(eq(procedureBooking.caseId, caseId)).limit(1)
      )[0]
      if (!booking || booking.status !== "PENDING_PATIENT_REQUIREMENTS")
        throw conflict("الحجز غير جاهز للتأكيد.")
      await tx
        .update(procedureBooking)
        .set({ status: "CONFIRMED", patientInstructionsAcknowledgedAt: new Date(), updatedBy: user.id })
        .where(eq(procedureBooking.id, booking.id))
      await tx.insert(procedureBookingHistory).values({
        procedureBookingId: booking.id,
        fromStatus: "PENDING_PATIENT_REQUIREMENTS",
        toStatus: "CONFIRMED",
        changedBy: user.id,
      })
      await setCaseStatus(tx, caseId, c.status, "PROCEDURE_CONFIRMED", user.id, "إقرار المريض وتأكيد الإجراء")
      await writeAudit({ action: "procedure.confirm", actorUserId: user.id, entityType: "aesthetic_case", entityId: caseId }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "procedure.confirmed",
      title: "تم تأكيد إجرائك",
      body: "تم تأكيد موعد إجرائك. ستجد التفاصيل في حالتك.",
      caseId,
      href: `/dashboard/cases/${caseId}`,
    })
    revalidatePath(`/dashboard/cases/${caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── 4) Center records procedure done → invoice + follow-up plan ───────────── */
const completeSchema = z.object({
  caseId: z.string().min(1),
  notes: z.string().max(4000).optional().default(""),
  anesthesiaType: z.string().max(200).optional().default(""),
})

const FOLLOWUP_TASKS = [
  { type: "GENERAL_CHECK" as const, title: "متابعة بعد 24 ساعة", hours: 24 },
  { type: "PHOTO_UPLOAD" as const, title: "رفع صور بعد 7 أيام", hours: 24 * 7 },
  { type: "DOCTOR_REVIEW" as const, title: "مراجعة الطبيب بعد 14 يومًا", hours: 24 * 14 },
  { type: "GENERAL_CHECK" as const, title: "متابعة بعد شهر", hours: 24 * 30 },
]

export async function completeProcedure(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROCEDURE_COMPLETE)
    const data = completeSchema.parse(input)
    const c = await loadCase(data.caseId)
    if (c.status !== "PROCEDURE_CONFIRMED")
      throw conflict("لا يمكن تسجيل إجراء غير مؤكد.")

    await db.transaction(async (tx) => {
      const booking = (
        await tx.select({ id: procedureBooking.id, status: procedureBooking.status }).from(procedureBooking).where(eq(procedureBooking.caseId, c.id)).limit(1)
      )[0]
      if (!booking || booking.status !== "CONFIRMED")
        throw conflict("الحجز غير مؤكد.")

      await tx.update(procedureBooking).set({ status: "COMPLETED", updatedBy: user.id }).where(eq(procedureBooking.id, booking.id))
      await tx.insert(procedureBookingHistory).values({
        procedureBookingId: booking.id,
        fromStatus: "CONFIRMED",
        toStatus: "COMPLETED",
        changedBy: user.id,
      })
      await tx.insert(procedureRecord).values({
        procedureBookingId: booking.id,
        performedByDoctorId: c.doctorId,
        actualStartAt: new Date(),
        actualEndAt: new Date(),
        anesthesiaType: data.anesthesiaType,
        notes: data.notes,
        followUpPlanCreated: true,
        status: "RECORDED",
        createdBy: user.id,
      })

      // follow-up plan + tasks
      const plan = await tx.insert(followUpPlan).values({ caseId: c.id, procedureBookingId: booking.id, doctorId: c.doctorId }).returning({ id: followUpPlan.id })
      for (const t of FOLLOWUP_TASKS) {
        await tx.insert(followUpTask).values({
          planId: plan[0].id,
          type: t.type,
          title: t.title,
          dueAt: new Date(Date.now() + t.hours * 3600_000),
          requiredPhotos: t.type === "PHOTO_UPLOAD" ? 3 : 0,
          status: "SCHEDULED",
        })
      }

      // invoice from the accepted quote (deposit already paid)
      const q = (
        await tx.select().from(quote).where(and(eq(quote.caseId, c.id), eq(quote.status, "ACCEPTED"))).orderBy(desc(quote.createdAt)).limit(1)
      )[0]
      if (q) {
        const inv = await tx
          .insert(invoice)
          .values({
            invoiceNumber: ref("INV"),
            patientUserId: c.patientUserId,
            centerId: c.centerId,
            caseId: c.id,
            quoteId: q.id,
            currency: q.currency,
            subtotal: q.subtotal,
            tax: q.tax,
            total: q.total,
            paidAmount: q.depositRequired,
            remainingAmount: q.remainingBalance,
            status: Number(q.remainingBalance) > 0 ? "PARTIALLY_PAID" : "PAID",
            createdBy: user.id,
          })
          .returning({ id: invoice.id })
        const items = await tx.select().from(quoteItem).where(eq(quoteItem.quoteId, q.id))
        for (const it of items) {
          await tx.insert(invoiceItem).values({
            invoiceId: inv[0].id,
            descriptionAr: it.descriptionAr,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            total: it.total,
            sortOrder: it.sortOrder,
          })
        }
      }

      await setCaseStatus(tx, c.id, c.status, "PROCEDURE_COMPLETED", user.id, "تنفيذ الإجراء")
      await writeAudit({ action: "procedure.complete", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "procedure.completed",
      title: "اكتمل إجراؤك — تبدأ المتابعة",
      body: "اكتمل إجراؤك بنجاح. ستجد خطة المتابعة وفاتورتك في حالتك.",
      caseId: c.id,
      href: `/dashboard/cases/${c.id}`,
    })
    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
