import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { canViewDocument } from "@/lib/rbac"
import { db } from "@/lib/db"
import { medicalDocument } from "@/lib/db/schema"
import { getSignedReadUrl } from "@/lib/storage/r2"
import { writeAudit, requestMeta } from "@/lib/audit"

/**
 * Returns a short-lived signed URL for a private medical document, then
 * redirects to it. Access is authorized per-document (owner, admin, or an
 * active grant) and every view is recorded in the audit log.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول." }, { status: 401 })

  if (!(await canViewDocument(user.id, id)))
    return NextResponse.json({ error: "غير مصرّح بالوصول لهذا الملف." }, { status: 403 })

  const doc = (
    await db
      .select({ objectKey: medicalDocument.objectKey, finalized: medicalDocument.finalized })
      .from(medicalDocument)
      .where(eq(medicalDocument.id, id))
      .limit(1)
  )[0]
  if (!doc || !doc.finalized)
    return NextResponse.json({ error: "الملف غير متاح." }, { status: 404 })

  const url = await getSignedReadUrl(doc.objectKey, 300)

  const meta = await requestMeta()
  await writeAudit({
    action: "medical_document.view",
    actorUserId: user.id,
    entityType: "medical_document",
    entityId: id,
    ...meta,
  })

  return NextResponse.redirect(url)
}
