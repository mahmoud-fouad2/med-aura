"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { writeAudit, requestMeta } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { toSafeError } from "@/lib/errors"
import { normalizeSignupPhone } from "@/lib/onboarding/validation"

const optionalTrimmed = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  )

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون سنة-شهر-يوم")
    .refine((v) => {
      const d = new Date(v)
      return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now()
    }, "تاريخ الميلاد غير صالح")
    .optional(),
)

const optionalCountry = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().length(2, "اختر الدولة").optional(),
)

const optionalPhone = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9\s\-()]{6,30}$/, "رقم غير صالح")
    .optional(),
)

/** Shared "tell us about yourself" fields — every one optional (data
 *  minimisation: a patient can always skip these and still use the platform). */
const DetailsSchema = z.object({
  dateOfBirth: optionalDate,
  nationality: optionalCountry,
  biologicalSex: z.enum(["male", "female"]).optional(),
  heightCm: z.number().int().min(30).max(280).optional(),
  weightKg: z.number().min(1).max(500).optional(),
  emergencyContactName: optionalTrimmed(160),
  emergencyContactPhone: optionalPhone,
})

export type ProfileDetailsInput = z.infer<typeof DetailsSchema>
export type ProfileActionResult = { ok: true } | { ok: false; error: string; code: string }

async function upsertPatientProfile(userId: string, values: Record<string, unknown>) {
  const existing = (
    await db
      .select({ id: patientProfile.id })
      .from(patientProfile)
      .where(eq(patientProfile.userId, userId))
      .limit(1)
  )[0]
  if (existing) {
    await db
      .update(patientProfile)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(patientProfile.id, existing.id))
  } else {
    await db.insert(patientProfile).values({ userId, ...values })
  }
}

/**
 * "Tell us about yourself" wizard step (age/sex/height/weight/emergency
 * contact) — shown once after first login, never blocking. Marks
 * profileWizardSeenAt so the wizard never reappears for this account.
 */
export async function saveProfileWizardDetails(
  input: ProfileDetailsInput,
): Promise<ProfileActionResult> {
  try {
    const me = await requireUser()
    const parsed = DetailsSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        code: "VALIDATION",
      }
    }
    const d = parsed.data
    await upsertPatientProfile(me.id, {
      dateOfBirth: d.dateOfBirth ?? null,
      nationality: d.nationality ?? null,
      biologicalSex: d.biologicalSex ?? null,
      heightCm: d.heightCm ?? null,
      weightKg: d.weightKg != null ? String(d.weightKg) : null,
      emergencyContactName: d.emergencyContactName ?? null,
      emergencyContactPhone: d.emergencyContactPhone ?? null,
      profileWizardSeenAt: new Date(),
    })

    const meta = await requestMeta()
    await writeAudit({
      action: "profile.wizard_completed",
      actorUserId: me.id,
      entityType: "patient_profile",
      entityId: me.id,
      ...meta,
    })

    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    logger.error("profile wizard save failed", { code: safe.code })
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Explicit "skip" — still marks the wizard seen so it stays a one-time prompt. */
export async function skipProfileWizard(): Promise<ProfileActionResult> {
  try {
    const me = await requireUser()
    await upsertPatientProfile(me.id, { profileWizardSeenAt: new Date() })
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const FullProfileSchema = DetailsSchema.extend({
  phone: z
    .string()
    .trim()
    .min(8, "رقم الهاتف قصير جدًا")
    .max(24, "رقم الهاتف طويل جدًا")
    .regex(/^[+0-9\s\-()]+$/, "رقم الهاتف غير صالح"),
  residenceCountry: z.string().trim().length(2, "اختر الدولة"),
  city: optionalTrimmed(120),
})

export type FullProfileInput = z.infer<typeof FullProfileSchema>

/**
 * Full self-service edit — the web equivalent of the mobile app's own
 * edit-profile screen (app/api/mobile/v1/me route.ts's PATCH). Reachable any
 * time from /dashboard/profile, not just during onboarding. Never touches
 * profileWizardSeenAt — editing later doesn't re-trigger the wizard.
 */
export async function updateOwnProfile(input: FullProfileInput): Promise<ProfileActionResult> {
  try {
    const me = await requireUser()
    const parsed = FullProfileSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
        code: "VALIDATION",
      }
    }
    const d = parsed.data
    const phone = normalizeSignupPhone(d.phone, d.residenceCountry)

    await db.transaction(async (tx) => {
      const existing = (
        await tx
          .select({ id: patientProfile.id })
          .from(patientProfile)
          .where(eq(patientProfile.userId, me.id))
          .limit(1)
      )[0]
      const values = {
        phone,
        residenceCountry: d.residenceCountry,
        city: d.city ?? null,
        dateOfBirth: d.dateOfBirth ?? null,
        nationality: d.nationality ?? null,
        biologicalSex: d.biologicalSex ?? null,
        heightCm: d.heightCm ?? null,
        weightKg: d.weightKg != null ? String(d.weightKg) : null,
        emergencyContactName: d.emergencyContactName ?? null,
        emergencyContactPhone: d.emergencyContactPhone ?? null,
      }
      if (existing) {
        await tx
          .update(patientProfile)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(patientProfile.id, existing.id))
      } else {
        await tx.insert(patientProfile).values({ userId: me.id, ...values })
      }
      await tx
        .update(user)
        .set({ phone, country: d.residenceCountry })
        .where(eq(user.id, me.id))

      const meta = await requestMeta()
      await writeAudit(
        {
          action: "profile.updated_from_web",
          actorUserId: me.id,
          entityType: "patient_profile",
          entityId: me.id,
          ...meta,
        },
        tx,
      )
    })

    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    logger.error("own profile update failed", { code: safe.code })
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
