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

/** Compliance approves a doctor application → publishes profile + grants role. */
export async function approveApplication(
  applicationId: string,
  note?: string,
): Promise<ActionResult<{ doctorId: string }>> {
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
    if (application.kind !== "DOCTOR")
      throw validation("نوع الطلب غير مدعوم حاليًا.")
    if (["APPROVED", "REJECTED"].includes(application.status))
      throw new AppError("CONFLICT", { userMessage: "تمت معالجة هذا الطلب مسبقًا." })

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
