import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { doctorProfile, user as userTable } from "@/lib/db/schema"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import {
  buildObjectKey,
  deleteObject,
  getPublicUrl,
  getUploadUrl,
  isR2Configured,
  objectExists,
} from "@/lib/storage/r2"
import { writeAudit, requestMeta } from "@/lib/audit"

export const dynamic = "force-dynamic"

const AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
// Raw upload cap — the app compresses/crops to well under this before
// uploading; this is just a sanity ceiling, not a target size.
const MAX_AVATAR_BYTES = 8 * 1024 * 1024

const PresignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

/** Step 1: a presigned upload slot, namespaced under the caller's own id. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  if (!isR2Configured()) return jsonError("خدمة رفع الصور غير مفعّلة حاليًا.", 503)

  const body = await request.json().catch(() => null)
  const parsed = PresignSchema.safeParse(body)
  if (!parsed.success) return jsonError("بيانات الصورة غير صالحة.", 400)
  const { fileName, contentType, sizeBytes } = parsed.data

  if (!AVATAR_MIME.has(contentType)) {
    return jsonError("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.", 422)
  }
  if (sizeBytes > MAX_AVATAR_BYTES) {
    return jsonError("حجم الصورة يتجاوز الحد المسموح.", 422)
  }

  const objectKey = buildObjectKey(`avatars/${auth.user.id}`, fileName)
  const uploadUrl = await getUploadUrl(objectKey, contentType)
  return jsonOk({ uploadUrl, objectKey })
}

const FinalizeSchema = z.object({ objectKey: z.string().min(1) })

/**
 * Step 2: confirm the file actually landed, then point the account (patient)
 * or provider profile (doctor — the same field search/booking already read)
 * at it. A doctor's photo is never stored anywhere a patient could reach.
 */
export async function PUT(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const me = auth.user

  const body = await request.json().catch(() => null)
  const parsed = FinalizeSchema.safeParse(body)
  if (!parsed.success) return jsonError("بيانات غير صحيحة.", 400)
  const { objectKey } = parsed.data

  // Only ever the caller's own namespace — this is what stops one account
  // from pointing itself at (or silently overwriting) someone else's photo.
  if (!objectKey.startsWith(`avatars/${me.id}/`)) {
    return jsonError("غير مصرّح بهذه العملية.", 403)
  }
  if (!(await objectExists(objectKey))) {
    return jsonError("تعذّر العثور على الصورة المرفوعة. حاول مرة أخرى.", 404)
  }

  const isDoctor = me.role === "doctor"
  let previousKey: string | null = null

  if (isDoctor) {
    const dp = (
      await db
        .select({ id: doctorProfile.id, photoKey: doctorProfile.photoKey })
        .from(doctorProfile)
        .where(eq(doctorProfile.userId, me.id))
        .limit(1)
    )[0]
    if (!dp) return jsonError("لم يتم العثور على ملف الطبيب.", 404)
    previousKey = dp.photoKey
    await db
      .update(doctorProfile)
      .set({ photoKey: objectKey, updatedAt: new Date() })
      .where(eq(doctorProfile.id, dp.id))
  } else {
    const row = (
      await db
        .select({ image: userTable.image })
        .from(userTable)
        .where(eq(userTable.id, me.id))
        .limit(1)
    )[0]
    previousKey = row?.image ?? null
    await db.update(userTable).set({ image: objectKey }).where(eq(userTable.id, me.id))
  }

  // Clean up the replaced file — only if it was one of ours (an avatar key
  // we created), never an external URL a future OAuth sign-in might set.
  if (previousKey && previousKey.startsWith("avatars/") && previousKey !== objectKey) {
    await deleteObject(previousKey).catch(() => undefined)
  }

  const meta = await requestMeta()
  await writeAudit({
    action: "profile.photo.updated",
    actorUserId: me.id,
    entityType: isDoctor ? "doctor_profile" : "user",
    entityId: me.id,
    ...meta,
  })

  return jsonOk({ photoUrl: absolutize(getPublicUrl(objectKey)) })
}

/** Removes the caller's own photo — never another account's. */
export async function DELETE() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const me = auth.user
  const isDoctor = me.role === "doctor"

  let currentKey: string | null = null
  if (isDoctor) {
    const dp = (
      await db
        .select({ id: doctorProfile.id, photoKey: doctorProfile.photoKey })
        .from(doctorProfile)
        .where(eq(doctorProfile.userId, me.id))
        .limit(1)
    )[0]
    if (dp) {
      currentKey = dp.photoKey
      await db
        .update(doctorProfile)
        .set({ photoKey: null, updatedAt: new Date() })
        .where(eq(doctorProfile.id, dp.id))
    }
  } else {
    const row = (
      await db
        .select({ image: userTable.image })
        .from(userTable)
        .where(eq(userTable.id, me.id))
        .limit(1)
    )[0]
    currentKey = row?.image ?? null
    await db.update(userTable).set({ image: null }).where(eq(userTable.id, me.id))
  }

  if (currentKey && currentKey.startsWith("avatars/")) {
    await deleteObject(currentKey).catch(() => undefined)
  }

  const meta = await requestMeta()
  await writeAudit({
    action: "profile.photo.removed",
    actorUserId: me.id,
    entityType: isDoctor ? "doctor_profile" : "user",
    entityId: me.id,
    ...meta,
  })

  return jsonOk({ removed: true })
}
