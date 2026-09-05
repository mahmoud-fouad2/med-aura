"use server"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  appointment,
  appointmentStatusHistory,
  doctorProfile,
  payment,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { getAvailableSlots } from "@/lib/data/availability"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, conflict, forbidden, toSafeError } from "@/lib/errors"
import {
  canCancelAppointment,
  canMarkAppointmentNoShow,
  canRescheduleMissedAppointment,
} from "@/lib/domain/appointment-state"
import type { ActionResult } from "@/lib/actions/provider"

async function getAppointmentForTransition(appointmentId: string) {
  return (
    await db
      .select({
        id: appointment.id,
        reference: appointment.reference,
        status: appointment.status,
        type: appointment.type,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        patientUserId: appointment.patientUserId,
        doctorId: appointment.doctorId,
        doctorUserId: doctorProfile.userId,
      })
      .from(appointment)
      .innerJoin(doctorProfile, eq(appointment.doctorId, doctorProfile.id))
      .where(eq(appointment.id, appointmentId))
      .limit(1)
  )[0]
}

export async function markAppointmentNoShow(
  appointmentId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const row = await getAppointmentForTransition(appointmentId)
    if (!row) throw new AppError("NOT_FOUND")

    const canManageAny = await hasPermission(user.id, PERMISSIONS.APPOINTMENT_CONFIRM)
    if (row.doctorUserId !== user.id && !canManageAny) throw forbidden()
    if (!canMarkAppointmentNoShow(row)) {
      throw conflict("لا يمكن تسجيل عدم الحضور إلا بعد انتهاء موعد مؤكد.")
    }

    await db.transaction(async (tx) => {
      await tx
        .update(appointment)
        .set({ status: "NO_SHOW" })
        .where(eq(appointment.id, row.id))
      await tx.insert(appointmentStatusHistory).values({
        appointmentId: row.id,
        fromStatus: row.status,
        toStatus: "NO_SHOW",
        changedBy: user.id,
        note: "Patient did not attend the scheduled appointment.",
      })
      await writeAudit(
        {
          action: "appointment.no_show",
          actorUserId: user.id,
          entityType: "appointment",
          entityId: row.id,
          metadata: { reference: row.reference, fromStatus: row.status },
        },
        tx,
      )
    })

    await notify({
      userId: row.patientUserId,
      type: "appointment.no_show",
      title: "تم تسجيل عدم حضور الموعد",
      body: "يمكنك اختيار موعد بديل من تفاصيل الموعد دون إنشاء دفعة جديدة.",
      href: "/dashboard/appointments",
    })
    revalidatePath("/admin/consultations")
    revalidatePath("/dashboard/appointments")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function rescheduleMissedAppointment(input: {
  appointmentId: string
  startsAt: string
}): Promise<ActionResult<{ appointmentId: string }>> {
  try {
    const user = await requireUser()
    const row = await getAppointmentForTransition(input.appointmentId)
    if (!row) throw new AppError("NOT_FOUND")
    if (row.patientUserId !== user.id) throw forbidden()
    if (!canRescheduleMissedAppointment(row.status)) {
      throw conflict("إعادة الجدولة متاحة فقط للموعد المسجل كعدم حضور.")
    }

    const slots = await getAvailableSlots(row.doctorId, {
      type: row.type,
      limit: 500,
    })
    const slot = slots.find((candidate) => candidate.startsAt === input.startsAt)
    if (!slot) throw conflict("هذا الموعد لم يعد متاحًا، اختر موعدًا آخر.")

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(appointment)
          .set({
            status: "RESCHEDULED",
            startsAt: new Date(slot.startsAt),
            endsAt: new Date(slot.endsAt),
          })
          .where(eq(appointment.id, row.id))
        await tx.insert(appointmentStatusHistory).values({
          appointmentId: row.id,
          fromStatus: "NO_SHOW",
          toStatus: "RESCHEDULED",
          changedBy: user.id,
          note: `Rescheduled after no-show from ${row.startsAt.toISOString()}.`,
        })
        await writeAudit(
          {
            action: "appointment.reschedule_after_no_show",
            actorUserId: user.id,
            entityType: "appointment",
            entityId: row.id,
            metadata: {
              reference: row.reference,
              previousStartsAt: row.startsAt.toISOString(),
              startsAt: slot.startsAt,
            },
          },
          tx,
        )
      })
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        throw conflict("هذا الموعد لم يعد متاحًا، اختر موعدًا آخر.")
      }
      throw err
    }

    await notify({
      userId: row.doctorUserId,
      type: "appointment.rescheduled",
      title: "أعاد المريض جدولة الموعد",
      body: `تم اختيار موعد جديد للحجز ${row.reference}.`,
      href: "/dashboard/appointments",
    })
    revalidatePath("/admin/consultations")
    revalidatePath("/dashboard/appointments")
    return { ok: true, data: { appointmentId: row.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function cancelAppointment(input: {
  appointmentId: string
  reason?: string
}): Promise<ActionResult<{ appointmentId: string }>> {
  try {
    const user = await requireUser()
    const row = await getAppointmentForTransition(input.appointmentId)
    if (!row) throw new AppError("NOT_FOUND")

    const isPatient = row.patientUserId === user.id
    const isDoctor = row.doctorUserId === user.id
    const canCancelAny = await hasPermission(user.id, PERMISSIONS.APPOINTMENT_CANCEL)

    if (!isPatient && !isDoctor && !canCancelAny) throw forbidden()

    if (!canCancelAppointment({ status: row.status, startsAt: row.startsAt })) {
      throw conflict("لا يمكن إلغاء هذا الموعد في حالته أو توقيته الحالي.")
    }

    const toStatus = isPatient ? "CANCELLED_BY_PATIENT" : "CANCELLED_BY_PROVIDER"
    const reasonText =
      input.reason?.trim() ||
      (isPatient ? "إلغاء من قبل المريض" : "إلغاء من قبل الطبيب أو المركز")

    await db.transaction(async (tx) => {
      await tx
        .update(appointment)
        .set({ status: toStatus })
        .where(eq(appointment.id, row.id))

      await tx.insert(appointmentStatusHistory).values({
        appointmentId: row.id,
        fromStatus: row.status,
        toStatus,
        changedBy: user.id,
        note: reasonText,
      })

      // Cancel any unfulfilled payments associated with this appointment
      await tx
        .update(payment)
        .set({
          status: "CANCELLED",
          failureReason: `Appointment was cancelled (${toStatus})`,
        })
        .where(
          and(
            eq(payment.appointmentId, row.id),
            inArray(payment.status, ["CREATED", "PENDING"]),
          ),
        )

      await writeAudit(
        {
          action: isPatient
            ? "appointment.cancel_by_patient"
            : "appointment.cancel_by_provider",
          actorUserId: user.id,
          entityType: "appointment",
          entityId: row.id,
          metadata: {
            reference: row.reference,
            fromStatus: row.status,
            toStatus,
            reason: reasonText,
          },
        },
        tx,
      )
    })

    const notifyTargetUserId = isPatient ? row.doctorUserId : row.patientUserId
    const notifyTitle = isPatient
      ? "تم إلغاء الموعد من قبل المريض"
      : "تم إلغاء الموعد من قبل الطبيب"
    const notifyBody = `تم إلغاء الموعد ${row.reference}. سبب الإلغاء: ${reasonText}`

    await notify({
      userId: notifyTargetUserId,
      type: "appointment.cancelled",
      title: notifyTitle,
      body: notifyBody,
      href: "/dashboard/appointments",
    })

    revalidatePath("/admin/consultations")
    revalidatePath("/dashboard/appointments")
    return { ok: true, data: { appointmentId: row.id } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}