"use server"

import { z } from "zod"
import { and, eq, desc, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  invoice,
  followUpTask,
  followUpPlan,
  caseClosure,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, canAccessCase, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { assertCaseTransition, type CaseStatus } from "@/lib/domain/case-state-machine"
import { hasOpenSafetyAlerts } from "@/lib/actions/safety"
import type { ActionResult } from "@/lib/actions/provider"

const UNPAID_INVOICE_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"]
const CLOSABLE_STATUSES: CaseStatus[] = ["PROCEDURE_COMPLETED", "FOLLOW_UP", "FULLY_PAID"]

export type ClosureEligibility = { eligible: boolean; reasons: string[] }

/** Business gates beyond the pure state-machine transition (which only knows FROM/TO validity). */
export async function getCaseClosureEligibility(caseId: string): Promise<ClosureEligibility> {
  const reasons: string[] = []

  const c = (
    await db.select({ id: aestheticCase.id, status: aestheticCase.status }).from(aestheticCase).where(eq(aestheticCase.id, caseId)).limit(1)
  )[0]
  if (!c) return { eligible: false, reasons: ["الحالة غير موجودة."] }
  if (!CLOSABLE_STATUSES.includes(c.status as CaseStatus)) {
    reasons.push("لا يمكن إغلاق الحالة في مرحلتها الحالية.")
  }

  if (await hasOpenSafetyAlerts(caseId)) {
    reasons.push("توجد تنبيهات سلامة مفتوحة لم تُحل بعد.")
  }

  const inv = (
    await db.select({ status: invoice.status }).from(invoice).where(eq(invoice.caseId, caseId)).orderBy(desc(invoice.createdAt)).limit(1)
  )[0]
  if (inv && UNPAID_INVOICE_STATUSES.includes(inv.status)) {
    reasons.push("توجد فاتورة غير مسددة بالكامل.")
  }

  const escalated = await db
    .select({ id: followUpTask.id })
    .from(followUpTask)
    .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
    .where(and(eq(followUpPlan.caseId, caseId), inArray(followUpTask.status, ["ESCALATED"])))
    .limit(1)
  if (escalated.length > 0) {
    reasons.push("توجد مهمة متابعة مصعّدة لم تُحل بعد.")
  }

  return { eligible: reasons.length === 0, reasons }
}

const closeSchema = z.object({
  caseId: z.string().min(1),
  reason: z.string().max(1000).optional().default(""),
})

export async function closeCase(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = closeSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    await requirePermission(user.id, PERMISSIONS.CASE_CLOSE)
    if (!(await canAccessCase(user.id, data.caseId))) throw forbidden()

    const c = (
      await db.select({ id: aestheticCase.id, status: aestheticCase.status, patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, data.caseId)).limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")

    const eligibility = await getCaseClosureEligibility(data.caseId)
    if (!eligibility.eligible) throw conflict(eligibility.reasons.join(" "))

    assertCaseTransition(c.status as CaseStatus, "CLOSED")

    await db.transaction(async (tx) => {
      await tx.update(aestheticCase).set({ status: "CLOSED", updatedBy: user.id }).where(eq(aestheticCase.id, c.id))
      await tx.insert(caseStatusHistory).values({ caseId: c.id, fromStatus: c.status as CaseStatus, toStatus: "CLOSED", changedBy: user.id, note: data.reason || undefined })
      await tx.insert(caseClosure).values({ caseId: c.id, closedBy: user.id, reason: data.reason || null })
      await writeAudit({ action: "case.close", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id, metadata: { reason: data.reason } }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "case.closed",
      title: "تم إغلاق حالتك",
      body: "اكتملت رحلتك في هذه الحالة. يمكنك مراجعة السجل الكامل في أي وقت.",
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

const reopenSchema = z.object({
  caseId: z.string().min(1),
  reason: z.string().min(5, "يجب ذكر سبب إعادة الفتح").max(1000),
})

export async function reopenCase(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = reopenSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    await requirePermission(user.id, PERMISSIONS.CASE_CLOSE)
    if (!(await canAccessCase(user.id, data.caseId))) throw forbidden()

    const c = (
      await db.select({ id: aestheticCase.id, status: aestheticCase.status, patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, data.caseId)).limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.status !== "CLOSED") throw conflict("الحالة ليست مغلقة.")

    // role-gated inside the state machine (CONCIERGE/CENTER_OWNER/CENTER_ADMIN/SUPER_ADMIN)
    assertCaseTransition("CLOSED", "FOLLOW_UP")

    await db.transaction(async (tx) => {
      await tx.update(aestheticCase).set({ status: "FOLLOW_UP", updatedBy: user.id }).where(eq(aestheticCase.id, c.id))
      await tx.insert(caseStatusHistory).values({ caseId: c.id, fromStatus: "CLOSED", toStatus: "FOLLOW_UP", changedBy: user.id, note: data.reason })

      const lastClosure = (
        await tx.select().from(caseClosure).where(eq(caseClosure.caseId, c.id)).orderBy(desc(caseClosure.closedAt)).limit(1)
      )[0]
      if (lastClosure) {
        await tx
          .update(caseClosure)
          .set({ reopenedBy: user.id, reopenedAt: new Date(), reopenReason: data.reason })
          .where(eq(caseClosure.id, lastClosure.id))
      }
      await writeAudit({ action: "case.reopen", actorUserId: user.id, entityType: "aesthetic_case", entityId: c.id, metadata: { reason: data.reason } }, tx)
    })

    await notify({
      userId: c.patientUserId,
      type: "case.reopened",
      title: "تمت إعادة فتح حالتك",
      body: data.reason,
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
