"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { internalTask } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

const createSchema = z.object({
  caseId: z.string().min(1).optional(),
  title: z.string().min(2, "العنوان مطلوب").max(200),
  description: z.string().max(2000).optional().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  dueAt: z.string().optional(),
  assignedTo: z.string().min(1).optional(),
})

export async function createInternalTask(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CONCIERGE_ACCESS)
    const parsed = createSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const rows = await db
      .insert(internalTask)
      .values({
        caseId: data.caseId,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        status: "OPEN",
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        assignedTo: data.assignedTo,
        createdBy: user.id,
      })
      .returning({ id: internalTask.id })

    await writeAudit({ action: "internal_task.create", actorUserId: user.id, entityType: "internal_task", entityId: rows[0].id })
    revalidatePath("/dashboard/concierge")
    return { ok: true, data: { id: rows[0].id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const statusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]),
})

export async function updateInternalTaskStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CONCIERGE_ACCESS)
    const parsed = statusSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const task = (await db.select({ id: internalTask.id }).from(internalTask).where(eq(internalTask.id, data.taskId)).limit(1))[0]
    if (!task) throw new AppError("NOT_FOUND")

    await db
      .update(internalTask)
      .set({ status: data.status, completedAt: data.status === "DONE" ? new Date() : null, updatedBy: user.id })
      .where(eq(internalTask.id, data.taskId))
    await writeAudit({ action: "internal_task.status", actorUserId: user.id, entityType: "internal_task", entityId: data.taskId, metadata: { status: data.status } })
    revalidatePath("/dashboard/concierge")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const assignSchema = z.object({
  taskId: z.string().min(1),
  assignedTo: z.string().min(1).nullable(),
})

export async function assignInternalTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CONCIERGE_ACCESS)
    const parsed = assignSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const task = (await db.select({ id: internalTask.id }).from(internalTask).where(eq(internalTask.id, data.taskId)).limit(1))[0]
    if (!task) throw new AppError("NOT_FOUND")

    await db.update(internalTask).set({ assignedTo: data.assignedTo, updatedBy: user.id }).where(eq(internalTask.id, data.taskId))
    await writeAudit({ action: "internal_task.assign", actorUserId: user.id, entityType: "internal_task", entityId: data.taskId, metadata: { assignedTo: data.assignedTo } })
    revalidatePath("/dashboard/concierge")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
