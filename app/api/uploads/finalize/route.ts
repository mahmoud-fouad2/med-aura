import { NextResponse } from "next/server"
import { and, eq, gt, isNull, or } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { medicalDocument, consent, documentAccessGrant } from "@/lib/db/schema"
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
        caseId: medicalDocument.caseId,
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

    // Ensure any doctor/provider with an active consent on this case receives an access grant
    if (doc.caseId) {
      const activeConsents = await tx
        .select({ id: consent.id, granteeUserId: consent.granteeUserId })
        .from(consent)
        .where(
          and(
            eq(consent.caseId, doc.caseId),
            eq(consent.status, "GRANTED"),
            or(isNull(consent.expiresAt), gt(consent.expiresAt, new Date())),
          ),
        )

      const existingGrants = await tx
        .select({ consentId: documentAccessGrant.consentId })
        .from(documentAccessGrant)
        .where(eq(documentAccessGrant.documentId, doc.id))
      const grantedConsentIds = new Set(existingGrants.map((g) => g.consentId))

      for (const c of activeConsents) {
        if (!grantedConsentIds.has(c.id)) {
          await tx.insert(documentAccessGrant).values({
            documentId: doc.id,
            consentId: c.id,
            granteeUserId: c.granteeUserId,
            grantedBy: user.id,
          })
        }
      }
    }

    await writeAudit(
      {
        action: "medical_document.upload",
        actorUserId: user.id,
        entityType: "medical_document",
        entityId: doc.id,
        ...meta,
      },
      tx,
    )
  })

  return NextResponse.json({ ok: true })
}
