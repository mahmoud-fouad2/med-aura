"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  followUpPlan,
  followUpTask,
  followUpEntry,
  doctorProfile,
  medicalDocument,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasRole, PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { createSafetyAlert } from "@/lib/actions/safety"
import type { ActionResult } from "@/lib/actions/provider"

async function loadTaskWithCase(taskId: string) {
  const row = (
    await db
      .select({
        taskId: followUpTask.id,
        status: followUpTask.status,
        title: followUpTask.title,
        requiredPhotos: followUpTask.requiredPhotos,
        planId: followUpPlan.id,
        doctorId: followUpPlan.doctorId,
        caseId: aestheticCase.id,
        patientUserId: aestheticCase.patientUserId,
      })
      .from(followUpTask)
      .innerJoin(followUpPlan, eq(followUpTask.planId, followUpPlan.id))
      .innerJoin(aestheticCase, eq(followUpPlan.caseId, aestheticCase.id))
      .where(eq(followUpTask.id, taskId))
      .limit(1)
  )[0]
  if (!row) throw new AppError("NOT_FOUND")
  return row
}

async function assertIsPlanDoctor(userId: string, doctorId: string | null) {
  if (await hasRole(userId, ROLES.SUPER_ADMIN)) return
  if (!doctorId) throw forbidden()
  const doc = (
    await db.select({ userId: doctorProfile.userId }).from(doctorProfile).where(eq(doctorProfile.id, doctorId)).limit(1)
  )[0]
  if (!doc || doc.userId !== userId) throw forbidden()
}

// MISSED is included so a late submission is still accepted — better late than never.
const SUBMITTABLE = ["SCHEDULED", "DUE", "MISSED"]

/* ── Patient: submit a follow-up task ───────────────────────────────────── */
const submitSchema = z.object({
  taskId: z.string().min(1),
  painScore: z.coerce.number().int().min(0).max(10).optional(),
  notes: z.string().max(4000).optional().default(""),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  documentIds: z.array(z.string().min(1)).max(20).optional().default([]),
})

export async function submitFollowUpTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = submitSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const task = await loadTaskWithCase(data.taskId)
    if (task.patientUserId !== user.id) throw forbidden()
    if (!SUBMITTABLE.includes(task.status))
      throw conflict("هذه المهمة ليست بانتظار إرسال حاليًا.")
    if (task.requiredPhotos > 0 && data.documentIds.length < task.requiredPhotos)
      throw validation(`هذه المهمة تتطلب ${task.requiredPhotos} صورة على الأقل.`)

    // every referenced document must belong to this patient's case (ownership check)
    if (data.documentIds.length > 0) {
      const owned = await db
        .select({ id: medicalDocument.id })
        .from(medicalDocument)
        .where(eq(medicalDocument.caseId, task.caseId))
      const ownedIds = new Set(owned.map((d) => d.id))
      if (!data.documentIds.every((id) => ownedIds.has(id)))
        throw forbidden()
    }

    await db.transaction(async (tx) => {
      await tx.insert(followUpEntry).values({
        taskId: task.taskId,
        authorUserId: user.id,
        painScore: data.painScore,
        notes: data.notes || null,
        answers: data.answers ?? null,
        documentIds: data.documentIds,
      })
      await tx
        .update(followUpTask)
        .set({ status: "SUBMITTED", submittedAt: new Date() })
        .where(eq(followUpTask.id, task.taskId))
      await writeAudit(
        {
          action: "followup.submit",
          actorUserId: user.id,
          entityType: "follow_up_task",
          entityId: task.taskId,
          metadata: { caseId: task.caseId, painScore: data.painScore },
        },
        tx,
      )
    })

    if (task.doctorId) {
      const doc = (
        await db.select({ userId: doctorProfile.userId }).from(doctorProfile).where(eq(doctorProfile.id, task.doctorId)).limit(1)
      )[0]
      if (doc) {
        await notify({
          userId: doc.userId,
          type: "followup.submitted",
          title: `أرسل المريض بيانات متابعة: ${task.title}`,
          caseId: task.caseId,
          href: `/dashboard/cases/${task.caseId}`,
        })
      }
    }

    revalidatePath(`/dashboard/cases/${task.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── Staff: manually schedule a follow-up task for a case ──────────────── */
const createTaskSchema = z.object({
  caseId: z.string().min(1),
  type: z.enum([
    "PHOTO_UPLOAD", "QUESTIONNAIRE", "VIDEO_APPOINTMENT", "IN_PERSON_APPOINTMENT",
    "MEDICATION_REMINDER", "GENERAL_CHECK", "DOCTOR_REVIEW",
  ]),
  title: z.string().min(3).max(200),
  instructions: z.string().max(2000).optional().default(""),
  dueAt: z.string().min(1),
  requiredPhotos: z.coerce.number().int().min(0).max(10).optional().default(0),
})

/** Staff-scheduled follow-up task — finds the case's existing plan or creates one. */
export async function createFollowUpTask(input: unknown): Promise<ActionResult<{ taskId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.FOLLOWUP_MANAGE)
    const parsed = createTaskSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const c = (
      await db
        .select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId, doctorId: aestheticCase.doctorId })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")

    let taskId = ""
    await db.transaction(async (tx) => {
      let plan = (
        await tx.select({ id: followUpPlan.id }).from(followUpPlan).where(eq(followUpPlan.caseId, c.id)).limit(1)
      )[0]
      if (!plan) {
        const inserted = await tx
          .insert(followUpPlan)
          .values({ caseId: c.id, doctorId: c.doctorId })
          .returning({ id: followUpPlan.id })
        plan = inserted[0]
      }

      const inserted = await tx
        .insert(followUpTask)
        .values({
          planId: plan.id,
          type: data.type,
          title: data.title,
          instructions: data.instructions || null,
          requiredPhotos: data.requiredPhotos,
          dueAt: new Date(data.dueAt),
          status: "SCHEDULED",
        })
        .returning({ id: followUpTask.id })
      taskId = inserted[0].id

      await writeAudit(
        { action: "followup.task.create", actorUserId: user.id, entityType: "follow_up_task", entityId: taskId, metadata: { caseId: c.id, type: data.type } },
        tx,
      )
    })

    await notify({
      userId: c.patientUserId,
      type: "followup.scheduled",
      title: `تمت جدولة متابعة جديدة: ${data.title}`,
      caseId: c.id,
      href: `/dashboard/cases/${c.id}`,
    })

    revalidatePath(`/dashboard/cases/${c.id}`)
    revalidatePath("/admin/follow-ups")
    return { ok: true, data: { taskId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── Doctor: review a submitted task ────────────────────────────────────── */
const reviewSchema = z.object({
  taskId: z.string().min(1),
  decision: z.enum(["complete", "resubmit", "escalate"]),
  reviewNotes: z.string().max(2000).optional().default(""),
})

export async function reviewFollowUpTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.FOLLOWUP_MANAGE)
    const parsed = reviewSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const task = await loadTaskWithCase(data.taskId)
    await assertIsPlanDoctor(user.id, task.doctorId)
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(task.status))
      throw conflict("هذه المهمة ليست بانتظار المراجعة.")

    let nextStatus: "COMPLETED" | "DUE" | "ESCALATED"
    if (data.decision === "complete") nextStatus = "COMPLETED"
    else if (data.decision === "resubmit") nextStatus = "DUE"
    else nextStatus = "ESCALATED"

    await db.transaction(async (tx) => {
      await tx
        .update(followUpTask)
        .set({
          status: nextStatus,
          reviewedAt: new Date(),
          reviewedBy: user.id,
          reviewNotes: data.reviewNotes || null,
          completedAt: nextStatus === "COMPLETED" ? new Date() : null,
        })
        .where(eq(followUpTask.id, task.taskId))
      await writeAudit(
        {
          action: `followup.review.${data.decision}`,
          actorUserId: user.id,
          entityType: "follow_up_task",
          entityId: task.taskId,
          metadata: { caseId: task.caseId },
        },
        tx,
      )
      if (data.decision === "escalate") {
        await createSafetyAlert(
          {
            caseId: task.caseId,
            patientUserId: task.patientUserId,
            severity: "HIGH",
            summary: `تصعيد من متابعة "${task.title}": ${data.reviewNotes || "بحاجة لمراجعة عاجلة"}`,
          },
          user.id,
          tx,
        )
      }
    })

    const notifTitle =
      data.decision === "complete"
        ? "تم اعتماد متابعتك"
        : data.decision === "resubmit"
          ? "الطبيب طلب إعادة إرسال بيانات المتابعة"
          : "تم تصعيد حالتك للمراجعة العاجلة"
    await notify({
      userId: task.patientUserId,
      type: `followup.${data.decision}`,
      title: notifTitle,
      body: data.reviewNotes || undefined,
      caseId: task.caseId,
      href: `/dashboard/cases/${task.caseId}`,
    })

    revalidatePath(`/dashboard/cases/${task.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
