import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { doctorProfile, patientProfile, user as userTable } from "@/lib/db/schema"
import { writeAudit, requestMeta } from "@/lib/audit"
import { absolutize, jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"
import { getPublicUrl } from "@/lib/storage/r2"

export const dynamic = "force-dynamic"

const PATIENT_ROLES = new Set(["patient"])
const DOCTOR_ROLES = new Set(["doctor"])

/** patient | doctor | staff — what the app tailors its UI to. */
function accountTypeFor(role: string): "patient" | "doctor" | "staff" {
  if (PATIENT_ROLES.has(role)) return "patient"
  if (DOCTOR_ROLES.has(role)) return "doctor"
  return "staff"
}

/** Session + profile snapshot the app loads right after boot/sign-in. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const { user } = auth

  const profile = (
    await db
      .select({
        phone: patientProfile.phone,
        residenceCountry: patientProfile.residenceCountry,
        city: patientProfile.city,
        onboardingCompleted: patientProfile.onboardingCompleted,
      })
      .from(patientProfile)
      .where(eq(patientProfile.userId, user.id))
      .limit(1)
  )[0]

  const accountType = accountTypeFor(user.role)

  // A doctor's display name is their provider-profile name (which the app
  // greets with a "د." prefix), NOT the raw account name. Only look it up for
  // doctors so patients pay no extra query. A doctor's public photo lives on
  // their provider profile (the same field the doctor list/search reads) —
  // never the bare account image — so editing it from the app updates the
  // exact photo patients already see everywhere.
  let doctorName: string | null = null
  let photoKey: string | null = null
  if (accountType === "doctor") {
    const dp = (
      await db
        .select({ name: doctorProfile.name, photoKey: doctorProfile.photoKey })
        .from(doctorProfile)
        .where(eq(doctorProfile.userId, user.id))
        .limit(1)
    )[0]
    doctorName = dp?.name?.trim() || null
    photoKey = dp?.photoKey ?? null
  } else {
    photoKey = user.image ?? null
  }

  // One resolved name the app can trust for every greeting/header — never
  // empty, never the app name, never a bare title.
  const displayName = (doctorName || user.name || "").trim()
  const photoUrl = photoKey ? absolutize(getPublicUrl(photoKey)) : null

  return jsonOk({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountType,
    displayName,
    doctorName,
    photoUrl,
    phone: profile?.phone ?? null,
    residenceCountry: profile?.residenceCountry ?? null,
    city: profile?.city ?? null,
    profileCompleted: profile?.onboardingCompleted ?? false,
  })
}

/** Mirrors completeSignupProfile's field rules — one truth for what a valid
    profile looks like, whether it's set at sign-up or edited later. */
const UpdateMeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "الاسم قصير جدًا")
    .max(120, "الاسم طويل جدًا"),
  phone: z
    .string()
    .trim()
    .min(8, "رقم الهاتف قصير جدًا")
    .max(20, "رقم الهاتف طويل جدًا")
    .regex(/^\+?[0-9\s-]+$/, "رقم الهاتف غير صالح"),
  residenceCountry: z.string().trim().length(2, "اختر الدولة"),
  city: z.string().trim().max(120).optional(),
})

/** Own-profile edit from the app (session-scoped — no id is accepted). */
export async function PATCH(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const me = auth.user

  const body = await request.json().catch(() => null)
  const parsed = UpdateMeSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "بيانات غير مكتملة",
      400,
    )
  }
  const { name, phone, residenceCountry, city } = parsed.data

  try {
    const existing = await db
      .select({ id: patientProfile.id })
      .from(patientProfile)
      .where(eq(patientProfile.userId, me.id))
      .limit(1)

    if (existing[0]) {
      await db
        .update(patientProfile)
        .set({
          phone,
          residenceCountry,
          city: city || null,
          updatedAt: new Date(),
        })
        .where(eq(patientProfile.id, existing[0].id))
    } else {
      await db.insert(patientProfile).values({
        userId: me.id,
        phone,
        residenceCountry,
        city: city || null,
      })
    }
    await db
      .update(userTable)
      .set({ name, phone })
      .where(eq(userTable.id, me.id))

    const meta = await requestMeta()
    await writeAudit({
      action: "profile.updated_from_app",
      actorUserId: me.id,
      entityType: "patient_profile",
      entityId: me.id,
      metadata: { residenceCountry },
      ...meta,
    })

    return jsonOk({ updated: true })
  } catch {
    return jsonError("تعذّر حفظ البيانات. حاول مرة أخرى.", 500)
  }
}
