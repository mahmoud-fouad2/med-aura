import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { medicalDocument } from "@/lib/db/schema"
import { objectExists } from "@/lib/storage/r2"
import { writeAudit, requestMeta } from "@/lib/audit"

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
      })
      .from(medicalDocument)
      .where(eq(medicalDocument.id, body.documentId))
      .limit(1)
  )[0]
  if (!doc) return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 })
  if (doc.ownerUserId !== user.id)
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 })

  // confirm the object really landed in storage before marking it ready
  const exists = await objectExists(doc.objectKey)
  if (!exists)
    return NextResponse.json(
      { error: "لم يكتمل رفع الملف. حاول مرة أخرى." },
      { status: 409 },
    )

  await db
    .update(medicalDocument)
    .set({ finalized: true })
    .where(eq(medicalDocument.id, doc.id))

  const meta = await requestMeta()
  await writeAudit({
    action: "medical_document.upload",
    actorUserId: user.id,
    entityType: "medical_document",
    entityId: doc.id,
    ...meta,
  })

  return NextResponse.json({ ok: true })
}
