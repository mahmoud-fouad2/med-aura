import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { aestheticCase, medicalDocument } from "@/lib/db/schema"
import { isR2Configured, getUploadUrl, buildObjectKey } from "@/lib/storage/r2"
import { validateUpload } from "@/lib/uploads"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول." }, { status: 401 })

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "خدمة رفع الملفات غير مفعّلة حاليًا." },
      { status: 503 },
    )
  }

  let body: {
    caseId?: string
    fileName?: string
    contentType?: string
    sizeBytes?: number
    kind?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 })
  }

  const { caseId, fileName, contentType, sizeBytes, kind } = body
  if (!caseId || !fileName || !contentType || !sizeBytes) {
    return NextResponse.json({ error: "بيانات الملف ناقصة." }, { status: 400 })
  }

  const check = validateUpload({ contentType, sizeBytes })
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 422 })

  // ownership: only the case owner may upload to their case
  const caseRow = (
    await db
      .select({ patientUserId: aestheticCase.patientUserId })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, caseId))
      .limit(1)
  )[0]
  if (!caseRow) return NextResponse.json({ error: "الحالة غير موجودة." }, { status: 404 })
  if (caseRow.patientUserId !== user.id)
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 })

  const objectKey = buildObjectKey(`cases/${caseId}`, fileName)

  const inserted = await db
    .insert(medicalDocument)
    .values({
      caseId,
      ownerUserId: user.id,
      kind: kind === "MEDICAL_REPORT" ? "MEDICAL_REPORT" : "CASE_PHOTO",
      objectKey,
      fileName,
      contentType,
      sizeBytes,
      finalized: false,
    })
    .returning({ id: medicalDocument.id })

  const uploadUrl = await getUploadUrl(objectKey, contentType)

  return NextResponse.json({
    documentId: inserted[0].id,
    uploadUrl,
    objectKey,
  })
}
