import type { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  appointment,
  appointmentStatusHistory,
  payment,
} from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { isTestPaymentEnabled } from "@/lib/env"
import { writeAudit, requestMeta } from "@/lib/audit"
import { jsonError, jsonOk } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/**
 * QA-ONLY: confirm an appointment as if its consultation fee were paid, so the
 * full booking → confirmed → video journey can be exercised without a real
 * charge. Mirrors the Stripe webhook's confirm path exactly.
 *
 * Triple-gated and safe for production data:
 *   1. Hidden unless ENABLE_TEST_PAYMENT_TOOLS=true (otherwise 404 — the route
 *      doesn't even acknowledge it exists).
 *   2. Requires an admin session (ADMIN_ACCESS) on top of the flag.
 *   3. Only touches an appointment still in PENDING_PAYMENT.
 * Every use is audited with action "payment.test_paid".
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Gate 1: the tool is off by default. 404 hides it entirely.
  if (!isTestPaymentEnabled()) {
    return jsonError("غير موجود.", 404)
  }

  // Gate 2: admin only.
  const user = await getCurrentUser()
  if (!user) return jsonError("انتهت الجلسة. سجّل الدخول مرة أخرى.", 401)
  if (!(await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS))) {
    return jsonError("هذا الإجراء غير متاح لحسابك.", 403)
  }

  const { id } = await params

  try {
    const result = await db.transaction(async (tx) => {
      const appt = (
        await tx
          .select({ id: appointment.id, status: appointment.status })
          .from(appointment)
          .where(eq(appointment.id, id))
          .limit(1)
      )[0]
      if (!appt) return { ok: false as const, error: "الموعد غير موجود.", status: 404 }
      // Gate 3: only a not-yet-paid appointment is eligible.
      if (appt.status !== "PENDING_PAYMENT") {
        return {
          ok: false as const,
          error: "هذا الموعد مؤكّد بالفعل أو لم يعد بانتظار الدفع.",
          status: 409,
        }
      }

      // Mark the booking's consultation-fee payment as paid (if the booking
      // created one), matching the real webhook.
      await tx
        .update(payment)
        .set({ status: "PAID", paidAt: new Date(), provider: "test" })
        .where(
          and(
            eq(payment.appointmentId, appt.id),
            eq(payment.purpose, "CONSULTATION_FEE"),
          ),
        )

      await tx
        .update(appointment)
        .set({ status: "CONFIRMED" })
        .where(eq(appointment.id, appt.id))
      await tx.insert(appointmentStatusHistory).values({
        appointmentId: appt.id,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "CONFIRMED",
        note: "تأكيد اختباري (أداة QA)",
      })
      return { ok: true as const }
    })

    if (!result.ok) return jsonError(result.error, result.status)

    const meta = await requestMeta()
    await writeAudit({
      action: "payment.test_paid",
      actorUserId: user.id,
      entityType: "appointment",
      entityId: id,
      metadata: { tool: "mark-test-paid" },
      ...meta,
    })

    return jsonOk({ confirmed: true })
  } catch {
    return jsonError("تعذّر إتمام العملية. حاول مرة أخرى.", 500)
  }
}
