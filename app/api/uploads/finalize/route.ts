import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { medicalDocument } from "@/lib/db/schema"
import { deleteObject, inspectObject } from "@/lib/storage/r2"
import { writeAudit, requestMeta } from "@/lib/audit"
import { hasValidFileSignature } from "@/lib/uploads"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول." }, { status: 401 })

  let body: { documentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 })
  }
  if (!body.documentId)
    return NextResponse.json({ error: "معرّف الملف مفقود." }, { status: 400 })

  const doc = (
    await db
      .select({
        id: medicalDocument.id,
        ownerUserId: medicalDocument.ownerUserId,
        objectKey: medicalDocument.objectKey,
        contentType: medicalDocument.contentType,
        sizeBytes: medicalDocument.sizeBytes,
        finalized: medicalDocument.finalized,
      })
      .from(medicalDocument)
      .where(eq(medicalDocument.id, body.documentId))
      .limit(1)
  )[0]
  if (!doc) return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 })
  if (doc.ownerUserId !== user.id)
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 })
  if (doc.finalized) return NextResponse.json({ ok: true })

  const stored = await inspectObject(doc.objectKey)
  if (!stored)
    return NextResponse.json(
      { error: "لم يكتمل رفع الملف. حاول مرة أخرى." },
      { status: 409 },
    )

  const valid =
    stored.sizeBytes === doc.sizeBytes &&
    stored.contentType === doc.contentType &&
    hasValidFileSignature(doc.contentType, stored.prefix)
  if (!valid) {
    await deleteObject(doc.objectKey).catch(() => undefined)
    await db.delete(medicalDocument).where(eq(medicalDocument.id, doc.id))
    return NextResponse.json(
      { error: "محتوى الملف لا يطابق نوعه أو حجمه. اختر الملف من جديد." },
      { status: 422 },
    )
  }

  const meta = await requestMeta()
  await db.transaction(async (tx) => {
    await tx
      .update(medicalDocument)
      .set({ finalized: true })
      .where(eq(medicalDocument.id, doc.id))
    await writeAudit({
      action: "medical_document.upload",
      actorUserId: user.id,
      entityType: "medical_document",
      entityId: doc.id,
      ...meta,
    }, tx)
  })

  return NextResponse.json({ ok: true })
}
