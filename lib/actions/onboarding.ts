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

const SignupProfileSchema = z.object({
  // "doctor" only routes the user into the provider-accreditation flow —
  // it never assigns a role. Roles stay server-controlled (admin approval).
  accountType: z.enum(["patient", "doctor"]),
  phone: z
    .string()
    .trim()
    .min(8, "رقم الهاتف قصير جدًا")
    .max(24, "رقم الهاتف طويل جدًا")
    .regex(/^[+0-9\s\-()]+$/, "رقم الهاتف غير صالح"),
  residenceCountry: z.string().trim().length(2, "اختر الدولة"),
  city: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(120).optional(),
  ),
})

export type SignupProfileInput = z.infer<typeof SignupProfileSchema>

export type SignupProfileResult =
  | { ok: true; next: string }
  | { ok: false; error: string }

/**
 * Completes a fresh sign-up with the profile details collected on the form
 * (own profile only). Doctors are then sent to the existing accreditation
 * application — the account itself is always created as a patient.
 */
export async function completeSignupProfile(
  input: SignupProfileInput,
): Promise<SignupProfileResult> {
  try {
    const me = await requireUser()
    const parsed = SignupProfileSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "بيانات غير مكتملة",
      }
    }
    const { accountType, residenceCountry, city } = parsed.data
    const phone = normalizeSignupPhone(parsed.data.phone, residenceCountry)

    const meta = await requestMeta()

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: patientProfile.id })
        .from(patientProfile)
        .where(eq(patientProfile.userId, me.id))
        .limit(1)

      if (existing[0]) {
        await tx
          .update(patientProfile)
          .set({
            phone,
            residenceCountry,
            city: city || null,
            onboardingCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(patientProfile.id, existing[0].id))
      } else {
        await tx.insert(patientProfile).values({
          userId: me.id,
          phone,
          residenceCountry,
          city: city || null,
          onboardingCompleted: true,
        })
      }

      await tx.update(user).set({ phone, country: residenceCountry }).where(eq(user.id, me.id))

      await writeAudit({
        action: "signup.profile_completed",
        actorUserId: me.id,
        entityType: "patient_profile",
        entityId: me.id,
        metadata: { accountType, residenceCountry },
        ...meta,
      }, tx)
    })

    return {
      ok: true,
      next: accountType === "doctor" ? "/dashboard/provider/apply" : "/dashboard",
    }
  } catch (err) {
    const safe = toSafeError(err)
    logger.error("signup profile completion failed", {
      code: safe.code,
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      ok: false,
      error: safe.userMessage,
    }
  }
}
