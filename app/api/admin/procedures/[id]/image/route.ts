import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { procedure } from "@/lib/db/schema"
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
  slot: z.enum(["main", "gallery"]),
})

/** Step 1: a presigned upload slot for one procedure's main or gallery image. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)
    if (!isR2Configured())
      return NextResponse.json({ error: "خدمة رفع الصور غير مفعّلة حاليًا." }, { status: 503 })

    const { id } = await params
    const existing = (
      await db.select({ id: procedure.id }).from(procedure).where(eq(procedure.id, id)).limit(1)
    )[0]
    if (!existing) return NextResponse.json({ error: "الإجراء غير موجود." }, { status: 404 })

    const body = await req.json().catch(() => null)
    const parsed = PresignSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "بيانات الصورة غير صالحة." }, { status: 400 })
    const { fileName, contentType, sizeBytes, slot } = parsed.data

    const check = validateEntityImage({ contentType, sizeBytes })
    if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 422 })

    const objectKey = buildObjectKey(`catalog/procedures/${id}/${slot}`, fileName)
    const uploadUrl = await getUploadUrl(objectKey, contentType)
    return NextResponse.json({ uploadUrl, objectKey })
  } catch (err) {
    const safe = toSafeError(err)
    return NextResponse.json({ error: safe.userMessage }, { status: safe.code === "FORBIDDEN" ? 403 : 400 })
  }
}

const FinalizeSchema = z.object({
  objectKey: z.string().min(1),
  slot: z.enum(["main", "gallery"]),
})

/** Step 2: confirm the object landed, then attach it to the procedure. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = FinalizeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 })
    const { objectKey, slot } = parsed.data

    // Only ever this procedure's own namespace/slot — stops one procedure's
    // upload from being pointed at another's object key.
    if (!objectKey.startsWith(`catalog/procedures/${id}/${slot}/`))
      return NextResponse.json({ error: "غير مصرّح بهذه العملية." }, { status: 403 })
    if (!(await objectExists(objectKey)))
      return NextResponse.json({ error: "تعذّر العثور على الصورة المرفوعة. حاول مرة أخرى." }, { status: 404 })

    const row = (
      await db
        .select({ id: procedure.id, imageKey: procedure.imageKey, galleryKeys: procedure.galleryKeys })
        .from(procedure)
        .where(eq(procedure.id, id))
        .limit(1)
    )[0]
    if (!row) throw new AppError("NOT_FOUND")

    if (slot === "main") {
      const previousKey = row.imageKey
      await db.update(procedure).set({ imageKey: objectKey, updatedBy: user.id, updatedAt: new Date() }).where(eq(procedure.id, id))
      if (previousKey && previousKey !== objectKey) await deleteObject(previousKey).catch(() => undefined)
    } else {
      await db
        .update(procedure)
        .set({ galleryKeys: [...row.galleryKeys, objectKey], updatedBy: user.id, updatedAt: new Date() })
        .where(eq(procedure.id, id))
    }

    const meta = await requestMeta()
    await writeAudit({
      action: slot === "main" ? "catalog.procedure.image.set" : "catalog.procedure.gallery.add",
      actorUserId: user.id,
      entityType: "procedure",
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

const RemoveSchema = z.object({ objectKey: z.string().min(1) })

/** Removes the main image or one gallery image. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.CATALOG_MANAGE)

    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = RemoveSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة." }, { status: 400 })
    const { objectKey } = parsed.data

    const row = (
      await db
        .select({ id: procedure.id, imageKey: procedure.imageKey, galleryKeys: procedure.galleryKeys })
        .from(procedure)
        .where(eq(procedure.id, id))
        .limit(1)
    )[0]
    if (!row) throw new AppError("NOT_FOUND")

    if (row.imageKey === objectKey) {
      await db.update(procedure).set({ imageKey: null, updatedBy: user.id, updatedAt: new Date() }).where(eq(procedure.id, id))
    } else if (row.galleryKeys.includes(objectKey)) {
      await db
        .update(procedure)
        .set({ galleryKeys: row.galleryKeys.filter((k) => k !== objectKey), updatedBy: user.id, updatedAt: new Date() })
        .where(eq(procedure.id, id))
    } else {
      return NextResponse.json({ error: "الصورة غير موجودة على هذا الإجراء." }, { status: 404 })
    }

    await deleteObject(objectKey).catch(() => undefined)

    const meta = await requestMeta()
    await writeAudit({
      action: "catalog.procedure.image.remove",
      actorUserId: user.id,
      entityType: "procedure",
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
