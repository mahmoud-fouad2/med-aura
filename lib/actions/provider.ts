"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  providerApplication,
  verificationReview,
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  procedure as procedureT,
  userRole,
  role as roleT,
  user as userT,
  center,
  centerStaff,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS, ROLES } from "@/lib/rbac"
import { encryptString, last4 } from "@/lib/crypto"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: string }

const doctorApplicationSchema = z.object({
  name: z.string().min(3, "الاسم مطلوب"),
  title: z.string().min(2, "المسمى المهني مطلوب"),
  bio: z.string().max(2000).optional().default(""),
  country: z.string().min(2, "الدولة مطلوبة"),
  city: z.string().min(2, "المدينة مطلوبة"),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  languages: z.array(z.string()).min(1, "أضف لغة واحدة على الأقل"),
  procedures: z.array(z.string()).min(1, "اختر إجراءً واحدًا على الأقل"),
  consultationFee: z.coerce.number().min(0).optional(),
  license: z.object({
    number: z.string().min(3, "رقم الترخيص مطلوب"),
    issuingAuthority: z.string().min(2, "جهة الإصدار مطلوبة"),
    issueDate: z.string().optional(),
    expiryDate: z.string().min(4, "تاريخ انتهاء الترخيص مطلوب"),
  }),
})

export type DoctorApplicationInput = z.infer<typeof doctorApplicationSchema>

const centerApplicationSchema = z.object({
  legalName: z.string().min(3, "الاسم القانوني للمركز مطلوب"),
  name: z.string().min(3, "الاسم التجاري للمركز مطلوب"),
  country: z.string().min(2, "الدولة مطلوبة"),
  city: z.string().min(2, "المدينة مطلوبة"),
  address: z.string().max(500).optional().default(""),
  phone: z.string().min(6, "رقم الهاتف مطلوب"),
  email: z.email("بريد إلكتروني غير صالح"),
  website: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined),
  representativeName: z.string().min(3, "اسم المسؤول المفوّض مطلوب"),
  representativeTitle: z.string().min(2, "المسمى مطلوب"),
  languages: z.array(z.string()).min(1, "أضف لغة واحدة على الأقل"),
  services: z.array(z.string()).min(1, "اذكر خدمة واحدة على الأقل"),
  license: z.object({
    commercialRegistration: z
      .string()
      .min(3, "رقم السجل التجاري مطلوب"),
    facilityLicenseNumber: z.string().min(3, "رقم ترخيص المنشأة مطلوب"),
    licenseExpiryDate: z
      .string()
      .min(4, "تاريخ انتهاء ترخيص المنشأة مطلوب"),
    issuingAuthority: z.string().min(2, "جهة الإصدار مطلوبة"),
  }),
  notes: z.string().max(2000).optional().default(""),
  consent: z.literal(true, "الموافقة مطلوبة"),
})

export type CenterApplicationInput = z.infer<typeof centerApplicationSchema>

/**
 * Center application. Submitter must be signed in — the same PROVIDER_APPLY
 * permission that gates doctor applications also gates centers. Never grants
 * a role; compliance review remains the only path to approval.
 *
 * Sensitive fields (commercial registration, facility license number) are
 * encrypted in the payload and never displayed unmasked in the admin queue.
 */
export async function submitCenterApplication(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_APPLY)

    const parsed = centerApplicationSchema.safeParse(input)
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "بيانات غير صحيحة"
      throw validation(first)
    }
    const data = parsed.data

    // one open application per applicant, matching the doctor policy
    const existing = await db
      .select({ id: providerApplication.id, status: providerApplication.status })
      .from(providerApplication)
      .where(
        and(
          eq(providerApplication.applicantUserId, user.id),
          eq(providerApplication.kind, "CENTER"),
        ),
      )
      .limit(1)

    const openStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"]
    if (existing[0] && openStatuses.includes(existing[0].status)) {
      throw new AppError("CONFLICT", {
        userMessage: "لديك طلب انضمام مركز قيد المراجعة بالفعل.",
      })
    }

    const inserted = await db
      .insert(providerApplication)
      .values({
        kind: "CENTER",
        applicantUserId: user.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
        payload: {
          ...data,
          license: {
            ...data.license,
            commercialRegistration: encryptString(
              data.license.commercialRegistration,
            ),
            facilityLicenseNumber: encryptString(
              data.license.facilityLicenseNumber,
            ),
            commercialRegistrationLast4: last4(
              data.license.commercialRegistration,
            ),
            facilityLicenseNumberLast4: last4(data.license.facilityLicenseNumber),
          },
        },
        createdBy: user.id,
      })
      .returning({ id: providerApplication.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "provider.center.application.submit",
      actorUserId: user.id,
      entityType: "provider_application",
      entityId: inserted[0].id,
      metadata: { country: data.country, city: data.city },
      ...meta,
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/applications")
    return { ok: true, data: { applicationId: inserted[0].id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** A patient submits a doctor application. Never grants a role by itself. */
export async function submitDoctorApplication(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.PROVIDER_APPLY)

    const parsed = doctorApplicationSchema.safeParse(input)
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "بيانات غير صحيحة"
      throw validation(first)
    }
    const data = parsed.data

    // one open application per applicant
    const existing = await db
      .select({ id: providerApplication.id, status: providerApplication.status })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .limit(1)

    const openStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"]
    if (existing[0] && openStatuses.includes(existing[0].status)) {
      throw new AppError("CONFLICT", {
        userMessage: "لديك طلب انضمام قيد المراجعة بالفعل.",
      })
    }

    const inserted = await db
      .insert(providerApplication)
      .values({
        kind: "DOCTOR",
        applicantUserId: user.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
        payload: data,
        createdBy: user.id,
      })
      .returning({ id: providerApplication.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "provider.application.submit",
      actorUserId: user.id,
      entityType: "provider_application",
      entityId: inserted[0].id,
      ...meta,
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/applications")
    return { ok: true, data: { applicationId: inserted[0].id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

async function getRoleId(key: string): Promise<string | undefined> {
  const r = await db
    .select({ id: roleT.id })
    .from(roleT)
    .where(eq(roleT.key, key))
    .limit(1)
  return r[0]?.id
}

/** Compliance approves a doctor OR center application → publishes profile/center + grants role. */
export async function approveApplication(
  applicationId: string,
  note?: string,
): Promise<ActionResult<{ doctorId?: string; centerId?: string }>> {
  try {
    const reviewer = await requireUser()
    await requirePermission(reviewer.id, PERMISSIONS.PROVIDER_APPROVE)

    const appRows = await db
      .select()
      .from(providerApplication)
      .where(eq(providerApplication.id, applicationId))
      .limit(1)
    const application = appRows[0]
    if (!application) throw new AppError("NOT_FOUND")
    if (["APPROVED", "REJECTED"].includes(application.status))
      throw new AppError("CONFLICT", { userMessage: "تمت معالجة هذا الطلب مسبقًا." })

    if (application.kind === "CENTER") {
      return await approveCenterApplication(application, reviewer.id, note)
    }

    const data = doctorApplicationSchema.parse(application.payload)
    const doctorRoleId = await getRoleId(ROLES.DOCTOR)
    if (!doctorRoleId) throw new AppError("INTERNAL")

    const slug = `doctor-${crypto.randomUUID().slice(0, 8)}`

    const doctorId = await db.transaction(async (tx) => {
      const doc = await tx
        .insert(doctorProfile)
        .values({
          userId: application.applicantUserId,
          name: data.name,
          slug,
          title: data.title,
          bio: data.bio,
          languages: data.languages,
          country: data.country,
          city: data.city,
          yearsExperience: data.yearsExperience,
          consultationFee:
            data.consultationFee != null ? String(data.consultationFee) : null,
          currency: "SAR",
          offersVideo: true,
          offersInPerson: true,
          verified: true,
          published: true,
          status: "approved",
          createdBy: reviewer.id,
        })
        .returning({ id: doctorProfile.id })
      const newDoctorId = doc[0].id

      await tx.insert(doctorLicense).values({
        doctorId: newDoctorId,
        numberEncrypted: encryptString(data.license.number),
        numberLast4: last4(data.license.number),
        issuingAuthority: data.license.issuingAuthority,
        issueDate: data.license.issueDate || null,
        expiryDate: data.license.expiryDate,
        status: "VALID",
        lastVerifiedAt: new Date(),
      })

      // link procedures by slug
      const procs = await tx.select().from(procedureT)
      const bySlug = new Map(procs.map((p) => [p.slug, p.id]))
      for (const ps of data.procedures) {
        const pid = bySlug.get(ps)
        if (pid)
          await tx
            .insert(doctorProcedure)
            .values({ doctorId: newDoctorId, procedureId: pid })
            .onConflictDoNothing()
      }

      // grant DOCTOR role + denormalised primary role
      await tx
        .insert(userRole)
        .values({
          userId: application.applicantUserId,
          roleId: doctorRoleId,
          grantedBy: reviewer.id,
        })
        .onConflictDoNothing()
      await tx
        .update(userT)
        .set({ role: ROLES.DOCTOR })
        .where(eq(userT.id, application.applicantUserId))

      await tx
        .update(providerApplication)
        .set({
          status: "APPROVED",
          decidedAt: new Date(),
          resultingDoctorId: newDoctorId,
          reviewerNotes: note,
          updatedBy: reviewer.id,
        })
        .where(eq(providerApplication.id, applicationId))

      await tx.insert(verificationReview).values({
        applicationId,
        reviewerId: reviewer.id,
        action: "approve",
        note,
      })

      await writeAudit(
        {
          action: "provider.approve",
          actorUserId: reviewer.id,
          entityType: "provider_application",
          entityId: applicationId,
          metadata: { doctorId: newDoctorId },
        },
        tx,
      )

      return newDoctorId
    })

    revalidatePath("/admin/applications")
    revalidatePath("/search")
    return { ok: true, data: { doctorId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/** Compliance approves a center application → publishes the center + grants CENTER_ADMIN to the applicant. */
async function approveCenterApplication(
  application: typeof providerApplication.$inferSelect,
  reviewerId: string,
  note?: string,
): Promise<ActionResult<{ centerId: string }>> {
  try {
    const data = application.payload as CenterApplicationInput
    const centerRoleId = await getRoleId(ROLES.CENTER_ADMIN)
    if (!centerRoleId) throw new AppError("INTERNAL")

    const slug = `center-${crypto.randomUUID().slice(0, 8)}`

    const centerId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(center)
        .values({
          ownerId: application.applicantUserId,
          legalName: data.legalName,
          name: data.name,
          slug,
          country: data.country,
          city: data.city,
          address: data.address || null,
          phone: data.phone,
          email: data.email,
          website: data.website || null,
          languages: data.languages,
          verified: true,
          published: true,
          status: "approved",
          createdBy: reviewerId,
        })
        .returning({ id: center.id })
      const newCenterId = inserted[0].id

      await tx.insert(centerStaff).values({
        centerId: newCenterId,
        userId: application.applicantUserId,
        role: "owner",
      })

      await tx
        .insert(userRole)
        .values({ userId: application.applicantUserId, roleId: centerRoleId, grantedBy: reviewerId })
        .onConflictDoNothing()
      await tx
        .update(userT)
        .set({ role: ROLES.CENTER_ADMIN })
        .where(eq(userT.id, application.applicantUserId))

      await tx
        .update(providerApplication)
        .set({
          status: "APPROVED",
          decidedAt: new Date(),
          resultingCenterId: newCenterId,
          reviewerNotes: note,
          updatedBy: reviewerId,
        })
        .where(eq(providerApplication.id, application.id))

      await tx.insert(verificationReview).values({
        applicationId: application.id,
        reviewerId,
        action: "approve",
        note,
      })

      await writeAudit(
        {
          action: "provider.approve",
          actorUserId: reviewerId,
          entityType: "provider_application",
          entityId: application.id,
          metadata: { centerId: newCenterId },
        },
        tx,
      )

      return newCenterId
    })

    revalidatePath("/admin/applications")
    revalidatePath("/centers")
    return { ok: true, data: { centerId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const reviewer = await requireUser()
    await requirePermission(reviewer.id, PERMISSIONS.PROVIDER_APPROVE)
    if (!reason || reason.trim().length < 3)
      throw validation("يرجى إدخال سبب الرفض.")

    const appRows = await db
      .select({ id: providerApplication.id, status: providerApplication.status })
      .from(providerApplication)
      .where(eq(providerApplication.id, applicationId))
      .limit(1)
    if (!appRows[0]) throw new AppError("NOT_FOUND")
    if (["APPROVED", "REJECTED"].includes(appRows[0].status))
      throw new AppError("CONFLICT", { userMessage: "تمت معالجة هذا الطلب مسبقًا." })

    await db.transaction(async (tx) => {
      await tx
        .update(providerApplication)
        .set({
          status: "REJECTED",
          decidedAt: new Date(),
          reviewerNotes: reason,
          updatedBy: reviewer.id,
        })
        .where(eq(providerApplication.id, applicationId))
      await tx.insert(verificationReview).values({
        applicationId,
        reviewerId: reviewer.id,
        action: "reject",
        note: reason,
      })
      await writeAudit(
        {
          action: "provider.reject",
          actorUserId: reviewer.id,
          entityType: "provider_application",
          entityId: applicationId,
          metadata: { reason },
        },
        tx,
      )
    })

    revalidatePath("/admin/applications")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
