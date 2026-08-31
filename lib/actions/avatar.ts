"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { doctorProfile, user as userTable } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit, requestMeta } from "@/lib/audit"
import { toSafeError } from "@/lib/errors"
import {
  buildObjectKey,
  deleteObject,
  getPublicUrl,
  getUploadUrl,
  isR2Configured,
  objectExists,
} from "@/lib/storage/r2"

/**
 * Self-service profile-photo upload — shared by the patient settings page and
 * the doctor practice-settings page. Web equivalent of
 * app/api/mobile/v1/me/avatar/route.ts (same two-step presign/finalize flow,
 * same doctorProfile-vs-user.image branching); kept as its own action file
 * rather than folded into patient-profile.ts or doctor.ts since both pages
 * need it identically.
 */

const AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_AVATAR_BYTES = 8 * 1024 * 1024

const PresignSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

export type AvatarActionResult =
  | { ok: true; uploadUrl: string; objectKey: string }
  | { ok: false; error: string }

/** Step 1: a presigned upload slot, namespaced under the caller's own id. */
export async function getAvatarUploadUrlAction(
  input: z.infer<typeof PresignSchema>,
): Promise<AvatarActionResult> {
  try {
    const me = await requireUser()
    if (!isR2Configured()) return { ok: false, error: "خدمة رفع الصور غير مفعّلة حاليًا." }

    const parsed = PresignSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "بيانات الصورة غير صالحة." }
    const { fileName, contentType, sizeBytes } = parsed.data

    if (!AVATAR_MIME.has(contentType)) {
      return { ok: false, error: "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP." }
    }
    if (sizeBytes > MAX_AVATAR_BYTES) {
      return { ok: false, error: "حجم الصورة يتجاوز الحد المسموح." }
    }

    const objectKey = buildObjectKey(`avatars/${me.id}`, fileName)
    const uploadUrl = await getUploadUrl(objectKey, contentType)
    return { ok: true, uploadUrl, objectKey }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage }
  }
}

export type FinalizeAvatarResult = { ok: true; photoUrl: string | null } | { ok: false; error: string }

/**
 * Step 2: confirm the file landed, then point the account (patient) or
 * provider profile (doctor) at it — same rule the mobile route follows: a
 * doctor's photo lives on their provider profile (what search/booking
 * already reads), never the bare account image.
 */
export async function finalizeAvatarAction(objectKey: string): Promise<FinalizeAvatarResult> {
  try {
    const me = await requireUser()
    if (!objectKey.startsWith(`avatars/${me.id}/`)) {
      return { ok: false, error: "غير مصرّح بهذه العملية." }
    }
    if (!(await objectExists(objectKey))) {
      return { ok: false, error: "تعذّر العثور على الصورة المرفوعة. حاول مرة أخرى." }
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
      if (!dp) return { ok: false, error: "لم يتم العثور على ملف الطبيب." }
      previousKey = dp.photoKey
      await db
        .update(doctorProfile)
        .set({ photoKey: objectKey, updatedAt: new Date() })
        .where(eq(doctorProfile.id, dp.id))
    } else {
      const row = (
        await db.select({ image: userTable.image }).from(userTable).where(eq(userTable.id, me.id)).limit(1)
      )[0]
      previousKey = row?.image ?? null
      await db.update(userTable).set({ image: objectKey }).where(eq(userTable.id, me.id))
    }

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

    return { ok: true, photoUrl: getPublicUrl(objectKey) }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage }
  }
}

export type RemoveAvatarResult = { ok: true } | { ok: false; error: string }

/** Removes the caller's own photo — never another account's. */
export async function removeAvatarAction(): Promise<RemoveAvatarResult> {
  try {
    const me = await requireUser()
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
        await db.select({ image: userTable.image }).from(userTable).where(eq(userTable.id, me.id)).limit(1)
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

    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage }
  }
}
