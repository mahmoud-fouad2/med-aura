"use server"

import { revalidatePath } from "next/cache"
import { count, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  procedureCategory,
  procedure,
  aestheticCase,
  doctorProcedure,
  beforeAfterCase,
} from "@/lib/db/schema"
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

/**
 * Hard deletes below are refused while anything still references the row —
 * patient cases, doctor offerings, and published results all outlive catalog
 * housekeeping. The refusal message tells the admin what is attached and to
 * hide the item instead, so no raw FK error ever reaches the UI.
 */

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [existing] = await db
    .select({ nameAr: procedureCategory.nameAr })
    .from(procedureCategory)
    .where(eq(procedureCategory.id, id))
    .limit(1)
  if (!existing) return { status: "error", message: "القسم غير موجود" }

  const [procedures] = await db
    .select({ n: count() })
    .from(procedure)
    .where(eq(procedure.categoryId, id))
  if ((procedures?.n ?? 0) > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف «${existing.nameAr}»: يضم ${procedures.n} إجراءً. انقل الإجراءات لقسم آخر أو أخفِ القسم بدلًا من حذفه.`,
    }
  }

  await db.delete(procedureCategory).where(eq(procedureCategory.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: "catalog.category.delete",
    actorUserId: user.id,
    entityType: "procedure_category",
    entityId: id,
    metadata: { nameAr: existing.nameAr },
    ...meta,
  })
  revalidatePath("/admin/procedures")
  revalidatePath("/procedures")
  return { status: "ok" }
}

export async function deleteProcedureAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [existing] = await db
    .select({ nameAr: procedure.nameAr, slug: procedure.slug })
    .from(procedure)
    .where(eq(procedure.id, id))
    .limit(1)
  if (!existing) return { status: "error", message: "الإجراء غير موجود" }

  const [[cases], [doctors], [results]] = await Promise.all([
    db.select({ n: count() }).from(aestheticCase).where(eq(aestheticCase.procedureId, id)),
    db.select({ n: count() }).from(doctorProcedure).where(eq(doctorProcedure.procedureId, id)),
    db.select({ n: count() }).from(beforeAfterCase).where(eq(beforeAfterCase.procedureId, id)),
  ])
  const blockers: string[] = []
  if ((cases?.n ?? 0) > 0) blockers.push(`${cases.n} حالة مريض`)
  if ((doctors?.n ?? 0) > 0) blockers.push(`${doctors.n} طبيب يقدّمه`)
  if ((results?.n ?? 0) > 0) blockers.push(`${results.n} نتيجة قبل/بعد`)
  if (blockers.length > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف «${existing.nameAr}»: مرتبط بـ ${blockers.join(" و")}. أخفِ الإجراء بدلًا من حذفه للحفاظ على السجلات.`,
    }
  }

  await db.delete(procedure).where(eq(procedure.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: "catalog.procedure.delete",
    actorUserId: user.id,
    entityType: "procedure",
    entityId: id,
    metadata: { nameAr: existing.nameAr, slug: existing.slug },
    ...meta,
  })
  revalidatePath("/admin/procedures")
  revalidatePath("/procedures")
  revalidatePath(`/procedures/${existing.slug}`)
  return { status: "ok" }
}
