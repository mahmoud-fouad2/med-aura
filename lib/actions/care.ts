"use server"

import { z } from "zod"
import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  caseStatusHistory,
  appointment,
  appointmentStatusHistory,
  doctorProfile,
  consultationOutcome,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit, requestMeta } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import {
  assertCaseTransition,
  type CaseStatus,
} from "@/lib/domain/case-state-machine"
import type { ActionResult } from "@/lib/actions/provider"

const CONSULTATION_TYPES = [
  "VIDEO_CONSULTATION",
  "IN_PERSON_CONSULTATION",
  "PHONE_CONSULTATION",
] as const

async function assertCaseDoctor(userId: string, caseDoctorId: string | null) {
  if (!caseDoctorId) throw forbidden()
  const doc = (
    await db
      .select({ userId: doctorProfile.userId })
      .from(doctorProfile)
      .where(eq(doctorProfile.id, caseDoctorId))
      .limit(1)
  )[0]
  if (!doc || doc.userId !== userId) throw forbidden()
}

/** Doctor marks their CONFIRMED consultation as completed → CONSULTATION_COMPLETED. */
export async function completeConsultation(
  appointmentId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()

    const appt = (
      await db
        .select({
          id: appointment.id,
          status: appointment.status,
          caseId: appointment.caseId,
          doctorId: appointment.doctorId,
          patientUserId: appointment.patientUserId,
        })
        .from(appointment)
        .where(eq(appointment.id, appointmentId))
        .limit(1)
    )[0]
    if (!appt) throw new AppError("NOT_FOUND")
    await assertCaseDoctor(user.id, appt.doctorId)
    if (appt.status !== "CONFIRMED")
      throw conflict("لا يمكن إكمال استشارة غير مؤكدة.")
    if (!appt.caseId) throw validation("هذه الاستشارة غير مرتبطة بحالة.")

    const caseRow = (
      await db
        .select({ id: aestheticCase.id, status: aestheticCase.status })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, appt.caseId))
        .limit(1)
    )[0]
    if (!caseRow) throw new AppError("NOT_FOUND")
    assertCaseTransition(caseRow.status as CaseStatus, "CONSULTATION_COMPLETED")

    await db.transaction(async (tx) => {
      await tx
        .update(appointment)
        .set({ status: "COMPLETED" })
        .where(eq(appointment.id, appointmentId))
      await tx.insert(appointmentStatusHistory).values({
        appointmentId,
        fromStatus: "CONFIRMED",
        toStatus: "COMPLETED",
        changedBy: user.id,
      })
      await tx
        .update(aestheticCase)
        .set({ status: "CONSULTATION_COMPLETED", updatedBy: user.id })
        .where(eq(aestheticCase.id, caseRow.id))
      await tx.insert(caseStatusHistory).values({
        caseId: caseRow.id,
        fromStatus: caseRow.status,
        toStatus: "CONSULTATION_COMPLETED",
        changedBy: user.id,
      })
      await writeAudit(
        {
          action: "consultation.complete",
          actorUserId: user.id,
          entityType: "appointment",
          entityId: appointmentId,
          metadata: { caseId: caseRow.id },
        },
        tx,
      )
    })

    await notify({
      userId: appt.patientUserId,
      type: "consultation.completed",
      title: "اكتملت استشارتك",
      body: "اكتملت استشارتك. سيقوم الطبيب بتسجيل نتيجة الاستشارة قريبًا.",
      caseId: appt.caseId,
      href: `/dashboard/cases/${appt.caseId}`,
    })

    revalidatePath(`/dashboard/cases/${appt.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const outcomeSchema = z.object({
  caseId: z.string().min(1),
  suitabilityStatus: z.enum([
    "SUITABLE_PRELIMINARILY",
    "MORE_INFORMATION_REQUIRED",
    "IN_PERSON_ASSESSMENT_REQUIRED",
    "NOT_SUITABLE",
    "REFERRED_ELSEWHERE",
  ]),
  clinicalSummary: z.string().max(4000).optional().default(""),
  patientVisibleNotes: z.string().max(4000).optional().default(""),
  internalNotes: z.string().max(4000).optional().default(""),
  additionalInformationRequired: z.string().max(2000).optional().default(""),
  inPersonAssessmentRequired: z.boolean().optional().default(false),
  notSuitableReason: z.string().max(2000).optional().default(""),
})

/** The case's doctor records a real clinical outcome after the consultation. */
export async function recordConsultationOutcome(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = outcomeSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const caseRow = (
      await db
        .select({
          id: aestheticCase.id,
          status: aestheticCase.status,
          doctorId: aestheticCase.doctorId,
          patientUserId: aestheticCase.patientUserId,
        })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!caseRow) throw new AppError("NOT_FOUND")
    await assertCaseDoctor(user.id, caseRow.doctorId)
    if (caseRow.status !== "CONSULTATION_COMPLETED")
      throw conflict("سجّل النتيجة بعد إكمال الاستشارة.")

    const appt = (
      await db
        .select({ id: appointment.id, doctorId: appointment.doctorId })
        .from(appointment)
        .where(
          and(
            eq(appointment.caseId, data.caseId),
            eq(appointment.status, "COMPLETED"),
            inArray(appointment.type, [...CONSULTATION_TYPES]),
          ),
        )
        .orderBy(desc(appointment.startsAt))
        .limit(1)
    )[0]
    if (!appt) throw conflict("لا توجد استشارة مكتملة لهذه الحالة.")

    // determine resulting case status from the clinical outcome
    let nextCaseStatus: CaseStatus | null = null
    if (
      data.suitabilityStatus === "NOT_SUITABLE" ||
      data.suitabilityStatus === "REFERRED_ELSEWHERE"
    ) {
      nextCaseStatus = "CLOSED"
    } else if (data.suitabilityStatus === "MORE_INFORMATION_REQUIRED") {
      nextCaseStatus = "MORE_INFORMATION_REQUIRED"
    }
    if (nextCaseStatus) {
      assertCaseTransition(caseRow.status as CaseStatus, nextCaseStatus)
    }

    await db.transaction(async (tx) => {
      const existing = (
        await tx
          .select({ id: consultationOutcome.id })
          .from(consultationOutcome)
          .where(eq(consultationOutcome.appointmentId, appt.id))
          .limit(1)
      )[0]

      const values = {
        appointmentId: appt.id,
        caseId: caseRow.id,
        doctorId: caseRow.doctorId!,
        patientUserId: caseRow.patientUserId,
        suitabilityStatus: data.suitabilityStatus,
        clinicalSummary: data.clinicalSummary,
        patientVisibleNotes: data.patientVisibleNotes,
        internalNotes: data.internalNotes,
        additionalInformationRequired: data.additionalInformationRequired,
        inPersonAssessmentRequired: data.inPersonAssessmentRequired,
        notSuitableReason: data.notSuitableReason,
        completedAt: new Date(),
        updatedBy: user.id,
      }

      if (existing) {
        await tx
          .update(consultationOutcome)
          .set(values)
          .where(eq(consultationOutcome.id, existing.id))
      } else {
        await tx
          .insert(consultationOutcome)
          .values({ ...values, createdBy: user.id })
      }

      if (nextCaseStatus) {
        await tx
          .update(aestheticCase)
          .set({ status: nextCaseStatus, updatedBy: user.id })
          .where(eq(aestheticCase.id, caseRow.id))
        await tx.insert(caseStatusHistory).values({
          caseId: caseRow.id,
          fromStatus: caseRow.status,
          toStatus: nextCaseStatus,
          changedBy: user.id,
          note: "نتيجة الاستشارة",
        })
      }

      const meta = await requestMeta()
      await writeAudit(
        {
          action: "consultation.outcome",
          actorUserId: user.id,
          entityType: "aesthetic_case",
          entityId: caseRow.id,
          metadata: { suitabilityStatus: data.suitabilityStatus },
          ...meta,
        },
        tx,
      )
    })

    await notify({
      userId: caseRow.patientUserId,
      type: "consultation.outcome",
      title: "صدرت نتيجة استشارتك",
      body: outcomePatientMessage(data.suitabilityStatus),
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

function outcomePatientMessage(status: string): string {
  switch (status) {
    case "SUITABLE_PRELIMINARILY":
      return "وجد الطبيب أنك مرشّح مبدئيًا. ستصلك خطة علاجية قريبًا."
    case "MORE_INFORMATION_REQUIRED":
      return "يحتاج الطبيب إلى معلومات أو مستندات إضافية لاستكمال التقييم."
    case "IN_PERSON_ASSESSMENT_REQUIRED":
      return "يوصي الطبيب بإجراء تقييم حضوري لاستكمال الخطة."
    case "NOT_SUITABLE":
      return "بعد التقييم، لا يُنصح بهذا الإجراء حاليًا. راجع ملاحظات الطبيب."
    case "REFERRED_ELSEWHERE":
      return "أوصى الطبيب بإحالتك لجهة أنسب لحالتك."
    default:
      return "صدرت نتيجة استشارتك، يمكنك الاطلاع عليها في حالتك."
  }
}
