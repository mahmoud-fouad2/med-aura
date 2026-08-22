import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aestheticCase,
  followUpPlan,
  followUpTask,
  invoice,
} from "@/lib/db/schema"
import { hasOpenSafetyAlertsInternal } from "@/lib/safety"
import type { CaseStatus } from "@/lib/domain/case-state-machine"

const UNPAID_INVOICE_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"]
const CLOSABLE_STATUSES: CaseStatus[] = ["PROCEDURE_COMPLETED", "FOLLOW_UP", "FULLY_PAID"]

export type ClosureEligibility = { eligible: boolean; reasons: string[] }

/** Internal eligibility calculation. Call only after resource authorization. */
export async function getCaseClosureEligibilityInternal(
  caseId: string,
): Promise<ClosureEligibility> {
  const reasons: string[] = []
  const caseRow = (
    await db
      .select({ status: aestheticCase.status })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, caseId))
      .limit(1)
  )[0]
  if (!caseRow) return { eligible: false, reasons: ["الحالة غير موجودة."] }

  if (!CLOSABLE_STATUSES.includes(caseRow.status as CaseStatus)) {
    reasons.push("لا يمكن إغلاق الحالة في مرحلتها الحالية.")
  }
  if (await hasOpenSafetyAlertsInternal(caseId)) {
    reasons.push("توجد تنبيهات سلامة مفتوحة لم تُحل بعد.")
  }

  const latestInvoice = (
    await db
      .select({ status: invoice.status })
      .from(invoice)
      .where(eq(invoice.caseId, caseId))
      .orderBy(desc(invoice.createdAt))
      .limit(1)
  )[0]
  if (latestInvoice && UNPAID_INVOICE_STATUSES.includes(latestInvoice.status)) {
    reasons.push("توجد فاتورة غير مسددة بالكامل.")
  }

  const escalated = await db
    .select({ id: followUpTask.id })
    .from(followUpTask)
    .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
    .where(
      and(eq(followUpPlan.caseId, caseId), inArray(followUpTask.status, ["ESCALATED"])),
    )
    .limit(1)
  if (escalated.length > 0) reasons.push("توجد مهمة متابعة مصعّدة لم تُحل بعد.")

  return { eligible: reasons.length === 0, reasons }
}
