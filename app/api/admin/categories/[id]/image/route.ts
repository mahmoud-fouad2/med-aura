import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { procedureCategory } from "@/lib/db/schema"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { requireUser } from "@/lib/session"
import {
  buildObjectKey,
  deleteObject,
  getPublicUrl,
  getUploadUrl,
  isR2Configured,
  objectExists,
} from "@/lib/storage/r2"
import { writeAudit, requestMeta } from "@/lib/audit"
import { toSafeError, AppError } from "@/lib/errors"
import { validateEntityImage } from "@/lib/uploads"

export const dynamic = "force-dynamic"

const PresignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

/** Step 1: a presigned upload slot for one category's image. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)
    if (!isR2Configured())
      return NextResponse.json({ error: "خدمة رفع الصور غير مفعّلة حاليًا." }, { status: 503 })

    const { id } = await params
    const existing = (
      await db.select({ id: procedureCategory.id }).from(procedureCategory).where(eq(procedureCategory.id, id)).limit(1)
    )[0]
    if (!existing) return NextResponse.json({ error: "القسم غير موجود." }, { status: 404 })

    const body = await req.json().catch(() => null)
    const parsed = PresignSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "بيانات الصورة غير صالحة." }, { status: 400 })
    const { fileName, contentType, sizeBytes } = parsed.data

    const check = validateEntityImage({ contentType, sizeBytes })
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 422 })

    const objectKey = buildObjectKey(`catalog/categories/${id}/main`, fileName)
    const uploadUrl = await getUploadUrl(objectKey, contentType)
    return NextResponse.json({ uploadUrl, objectKey })
  } catch (err) {
    const safe = toSafeError(err)
    return NextResponse.json({ error: safe.userMessage }, { status: safe.code === "FORBIDDEN" ? 403 : 400 })
  }
}

const FinalizeSchema = z.object({ objectKey: z.string().min(1) })

/** Step 2: confirm the object landed, then attach it to the category. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = FinalizeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 })
    const { objectKey } = parsed.data

    // Only ever this category's own namespace — stops one category's upload
    // from being pointed at another's object key.
    if (!objectKey.startsWith(`catalog/categories/${id}/main/`))
      return NextResponse.json({ error: "غير مصرّح بهذه العملية." }, { status: 403 })
    const [exists, row] = await Promise.all([
      objectExists(objectKey),
      db
        .select({ id: procedureCategory.id, imageKey: procedureCategory.imageKey })
        .from(procedureCategory)
        .where(eq(procedureCategory.id, id))
        .limit(1)
        .then((rows) => rows[0]),
    ])
    if (!exists)
      return NextResponse.json({ error: "تعذّر العثور على الصورة المرفوعة. حاول مرة أخرى." }, { status: 404 })
    if (!row) throw new AppError("NOT_FOUND")

    const previousKey = row.imageKey
    await db
      .update(procedureCategory)
      .set({ imageKey: objectKey, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(procedureCategory.id, id))
    if (previousKey && previousKey !== objectKey) await deleteObject(previousKey).catch(() => undefined)

    const meta = await requestMeta()
    await writeAudit({
      action: "catalog.category.image.set",
      actorUserId: user.id,
      entityType: "procedure_category",
      entityId: id,
      metadata: { objectKey },
      ...meta,
    })

    return NextResponse.json({ url: getPublicUrl(objectKey) })
  } catch (err) {
    const safe = toSafeError(err)
    return NextResponse.json({ error: safe.userMessage }, { status: safe.code === "FORBIDDEN" ? 403 : 400 })
  }
}

/** Removes the category's image. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const { id } = await params
    const row = (
      await db
        .select({ id: procedureCategory.id, imageKey: procedureCategory.imageKey })
        .from(procedureCategory)
        .where(eq(procedureCategory.id, id))
        .limit(1)
    )[0]
    if (!row) throw new AppError("NOT_FOUND")
    if (!row.imageKey) return NextResponse.json({ error: "لا توجد صورة لهذا القسم." }, { status: 404 })

    const objectKey = row.imageKey
    await db
      .update(procedureCategory)
      .set({ imageKey: null, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(procedureCategory.id, id))
    await deleteObject(objectKey).catch(() => undefined)

    const meta = await requestMeta()
    await writeAudit({
      action: "catalog.category.image.remove",
      actorUserId: user.id,
      entityType: "procedure_category",
      entityId: id,
      metadata: { objectKey },
      ...meta,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const safe = toSafeError(err)
    return NextResponse.json({ error: safe.userMessage }, { status: safe.code === "FORBIDDEN" ? 403 : 400 })
  }
}
