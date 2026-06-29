"use server"

import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  consultationOutcome,
  doctorProfile,
  treatmentPlan,
  treatmentPlanVersion,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { assertCaseTransition, type CaseStatus } from "@/lib/domain/case-state-machine"
import type { ActionResult } from "@/lib/actions/provider"

async function loadCaseForDoctor(userId: string, caseId: string) {
  const caseRow = (
    await db
      .select({
        id: aestheticCase.id,
        status: aestheticCase.status,
        doctorId: aestheticCase.doctorId,
        centerId: aestheticCase.centerId,
        procedureId: aestheticCase.procedureId,
        patientUserId: aestheticCase.patientUserId,
      })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, caseId))
      .limit(1)
  )[0]
  if (!caseRow) throw new AppError("NOT_FOUND")
  if (!caseRow.doctorId) throw forbidden()
  const doc = (
    await db
      .select({ userId: doctorProfile.userId })
      .from(doctorProfile)
      .where(eq(doctorProfile.id, caseRow.doctorId))
      .limit(1)
  )[0]
  if (!doc || doc.userId !== userId) throw forbidden()
  return caseRow
}

const planSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(3, "عنوان الخطة مطلوب").max(200),
  medicalAssessment: z.string().max(4000).optional().default(""),
  anesthesiaType: z.string().max(200).optional().default(""),
  estimatedProcedureDuration: z.string().max(200).optional().default(""),
  recoveryPeriod: z.string().max(200).optional().default(""),
  preProcedureInstructions: z.string().max(4000).optional().default(""),
  postProcedureInstructions: z.string().max(4000).optional().default(""),
  mainRisks: z.string().max(4000).optional().default(""),
  contraindications: z.string().max(4000).optional().default(""),
  validityDays: z.coerce.number().int().min(1).max(365).optional().default(60),
})

/** Doctor creates a DRAFT treatment plan (blocked if the case is NOT_SUITABLE). */
export async function createTreatmentPlan(
  input: unknown,
): Promise<ActionResult<{ planId: string }>> {
  try {
    const user = await requireUser()
    const parsed = planSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data
    const caseRow = await loadCaseForDoctor(user.id, data.caseId)

    if (caseRow.status !== "CONSULTATION_COMPLETED" && caseRow.status !== "TREATMENT_PLAN_ISSUED")
      throw conflict("لا يمكن إنشاء خطة قبل إكمال الاستشارة.")

    const outcome = (
      await db
        .select({ suitabilityStatus: consultationOutcome.suitabilityStatus })
        .from(consultationOutcome)
        .where(eq(consultationOutcome.caseId, data.caseId))
        .orderBy(desc(consultationOutcome.createdAt))
        .limit(1)
    )[0]
    if (
      outcome &&
      (outcome.suitabilityStatus === "NOT_SUITABLE" ||
        outcome.suitabilityStatus === "REFERRED_ELSEWHERE")
    )
      throw conflict("لا يمكن إصدار خطة لحالة غير مناسبة.")

    const until = new Date(Date.now() + data.validityDays * 86400_000)
      .toISOString()
      .slice(0, 10)

    const inserted = await db
      .insert(treatmentPlan)
      .values({
        caseId: data.caseId,
        doctorId: caseRow.doctorId!,
        centerId: caseRow.centerId,
        proposedProcedureId: caseRow.procedureId,
        title: data.title,
        medicalAssessment: data.medicalAssessment,
        anesthesiaType: data.anesthesiaType,
        estimatedProcedureDuration: data.estimatedProcedureDuration,
        recoveryPeriod: data.recoveryPeriod,
        preProcedureInstructions: data.preProcedureInstructions,
        postProcedureInstructions: data.postProcedureInstructions,
        mainRisks: data.mainRisks,
        contraindications: data.contraindications,
        validityFrom: new Date().toISOString().slice(0, 10),
        validityUntil: until,
        status: "DRAFT",
        createdBy: user.id,
      })
      .returning({ id: treatmentPlan.id })

    await writeAudit({
      action: "treatment_plan.create",
      actorUserId: user.id,
      entityType: "treatment_plan",
      entityId: inserted[0].id,
      metadata: { caseId: data.caseId },
    })
    revalidatePath(`/dashboard/cases/${data.caseId}`)
    return { ok: true, data: { planId: inserted[0].id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Publish a draft plan → snapshot version, advance case to TREATMENT_PLAN_ISSUED. */
export async function publishTreatmentPlan(planId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const plan = (
      await db.select().from(treatmentPlan).where(eq(treatmentPlan.id, planId)).limit(1)
    )[0]
    if (!plan) throw new AppError("NOT_FOUND")
    const caseRow = await loadCaseForDoctor(user.id, plan.caseId)
    if (plan.status !== "DRAFT" && plan.status !== "REVISED")
      throw conflict("هذه الخطة منشورة بالفعل.")

    await db.transaction(async (tx) => {
      await tx
        .update(treatmentPlan)
        .set({ status: "PUBLISHED", publishedAt: new Date(), updatedBy: user.id })
        .where(eq(treatmentPlan.id, planId))
      await tx.insert(treatmentPlanVersion).values({
        treatmentPlanId: planId,
        version: plan.version,
        snapshot: plan as unknown as object,
        createdBy: user.id,
      })
      if (caseRow.status === "CONSULTATION_COMPLETED") {
        assertCaseTransition(caseRow.status as CaseStatus, "TREATMENT_PLAN_ISSUED")
        await tx
          .update(aestheticCase)
          .set({ status: "TREATMENT_PLAN_ISSUED", updatedBy: user.id })
          .where(eq(aestheticCase.id, caseRow.id))
        await tx.insert(caseStatusHistory).values({
          caseId: caseRow.id,
          fromStatus: caseRow.status,
          toStatus: "TREATMENT_PLAN_ISSUED",
          changedBy: user.id,
        })
      }
      await writeAudit(
        {
          action: "treatment_plan.publish",
          actorUserId: user.id,
          entityType: "treatment_plan",
          entityId: planId,
          metadata: { caseId: caseRow.id },
        },
        tx,
      )
    })

    await notify({
      userId: caseRow.patientUserId,
      type: "treatment_plan.published",
      title: "صدرت خطتك العلاجية",
      body: "أصدر طبيبك خطة علاجية لحالتك. يمكنك الاطلاع عليها الآن.",
      caseId: caseRow.id,
      href: `/dashboard/cases/${caseRow.id}`,
    })

    revalidatePath(`/dashboard/cases/${caseRow.id}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
