"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { procedureCategory, procedure } from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"

/**
 * Server actions for catalog management. Each action re-verifies the caller's
 * CATALOG_MANAGE permission (never trusts the client), validates payload with
 * zod, and appends an audit-log entry so every change is traceable to a user.
 * Deletes are soft (visible = false); catalog rows are never hard-removed while
 * procedures still reference them (schema uses onDelete: restrict).
 */

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const CategorySchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2).max(80).regex(slugRe, "الرابط الفريد: أحرف انجليزية صغيرة وأرقام وشرطات فقط"),
  nameAr: z.string().min(2).max(120),
  nameEn: z.string().min(2).max(120),
  descriptionAr: z.string().max(500).optional().nullable(),
  descriptionEn: z.string().max(500).optional().nullable(),
  icon: z.string().max(60).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  visible: z.coerce.boolean().default(true),
})

export type ActionResult =
  | { status: "ok"; id?: string }
  | { status: "error"; message: string }

function parseFormData(fd: FormData) {
  const raw = Object.fromEntries(fd.entries())
  return {
    ...raw,
    visible: raw.visible === "on" || raw.visible === "true",
  }
}

export async function upsertCategoryAction(fd: FormData): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const parsed = CategorySchema.safeParse(parseFormData(fd))
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const meta = await requestMeta()
  const { id, ...values } = parsed.data

  try {
    if (id) {
      const [updated] = await db
        .update(procedureCategory)
        .set(values)
        .where(eq(procedureCategory.id, id))
        .returning({ id: procedureCategory.id })
      if (!updated) return { status: "error", message: "القسم غير موجود" }
      await writeAudit({
        action: "catalog.category.update",
        actorUserId: user.id,
        entityType: "procedure_category",
        entityId: id,
        metadata: values,
        ...meta,
      })
    } else {
      const [inserted] = await db
        .insert(procedureCategory)
        .values({ ...values, createdBy: user.id, updatedBy: user.id })
        .returning({ id: procedureCategory.id })
      await writeAudit({
        action: "catalog.category.create",
        actorUserId: user.id,
        entityType: "procedure_category",
        entityId: inserted.id,
        metadata: values,
        ...meta,
      })
    }
    revalidatePath("/admin/procedures")
    revalidatePath("/procedures")
    return { status: "ok" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Unique slug violation
    if (msg.includes("duplicate key")) {
      return { status: "error", message: "الرابط الفريد مستخدم بالفعل" }
    }
    return { status: "error", message: "تعذّر حفظ القسم" }
  }
}

export async function toggleCategoryVisibleAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [current] = await db
    .select({ visible: procedureCategory.visible })
    .from(procedureCategory)
    .where(eq(procedureCategory.id, id))
    .limit(1)
  if (!current) return { status: "error", message: "القسم غير موجود" }

  await db
    .update(procedureCategory)
    .set({ visible: !current.visible, updatedBy: user.id })
    .where(eq(procedureCategory.id, id))

  const meta = await requestMeta()
  await writeAudit({
    action: current.visible ? "catalog.category.hide" : "catalog.category.show",
    actorUserId: user.id,
    entityType: "procedure_category",
    entityId: id,
    ...meta,
  })
  revalidatePath("/admin/procedures")
  revalidatePath("/procedures")
  return { status: "ok" }
}

const ProcedureSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "اختر قسمًا"),
  slug: z.string().min(2).max(80).regex(slugRe, "الرابط الفريد: أحرف انجليزية صغيرة وأرقام وشرطات فقط"),
  nameAr: z.string().min(2).max(120),
  nameEn: z.string().min(2).max(120),
  descriptionAr: z.string().max(2000).optional().nullable(),
  descriptionEn: z.string().max(2000).optional().nullable(),
  isSurgical: z.coerce.boolean().default(false),
  recoveryDays: z.coerce.number().int().min(0).max(365).optional().nullable(),
  visible: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
})

export async function upsertProcedureAction(fd: FormData): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const cleaned = {
    ...parseFormData(fd),
    isSurgical:
      fd.get("isSurgical") === "on" || fd.get("isSurgical") === "true",
    recoveryDays: fd.get("recoveryDays") === "" ? null : fd.get("recoveryDays"),
  }
  const parsed = ProcedureSchema.safeParse(cleaned)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const meta = await requestMeta()
  const { id, ...values } = parsed.data

  try {
    if (id) {
      const [updated] = await db
        .update(procedure)
        .set(values)
        .where(eq(procedure.id, id))
        .returning({ id: procedure.id })
      if (!updated) return { status: "error", message: "الإجراء غير موجود" }
      await writeAudit({
        action: "catalog.procedure.update",
        actorUserId: user.id,
        entityType: "procedure",
        entityId: id,
        metadata: values,
        ...meta,
      })
    } else {
      const [inserted] = await db
        .insert(procedure)
        .values({ ...values, createdBy: user.id, updatedBy: user.id })
        .returning({ id: procedure.id })
      await writeAudit({
        action: "catalog.procedure.create",
        actorUserId: user.id,
        entityType: "procedure",
        entityId: inserted.id,
        metadata: values,
        ...meta,
      })
    }
    revalidatePath("/admin/procedures")
    revalidatePath("/procedures")
    revalidatePath(`/procedures/${values.slug}`)
    return { status: "ok" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("duplicate key")) {
      return { status: "error", message: "الرابط الفريد مستخدم بالفعل" }
    }
    return { status: "error", message: "تعذّر حفظ الإجراء" }
  }
}

export async function toggleProcedureVisibleAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [current] = await db
    .select({ visible: procedure.visible, slug: procedure.slug })
    .from(procedure)
    .where(eq(procedure.id, id))
    .limit(1)
  if (!current) return { status: "error", message: "الإجراء غير موجود" }

  await db
    .update(procedure)
    .set({ visible: !current.visible, updatedBy: user.id })
    .where(eq(procedure.id, id))

  const meta = await requestMeta()
  await writeAudit({
    action: current.visible ? "catalog.procedure.hide" : "catalog.procedure.show",
    actorUserId: user.id,
    entityType: "procedure",
    entityId: id,
    ...meta,
  })
  revalidatePath("/admin/procedures")
  revalidatePath("/procedures")
  revalidatePath(`/procedures/${current.slug}`)
  return { status: "ok" }
}
