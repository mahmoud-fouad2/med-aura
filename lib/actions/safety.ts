"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  symptomReport,
  safetyAlert,
  doctorProfile,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { WARNING_SIGNS } from "@/lib/care/warning-signs"
import {
  createSafetyAlertInternal,
  notifySafetyAlertRecipientsInternal,
} from "@/lib/safety"
import type { ActionResult } from "@/lib/actions/provider"

/* ── Patient: report symptoms → may auto-create a safety alert ─────────── */
const reportSchema = z.object({
  caseId: z.string().min(1),
  symptoms: z.array(z.string().min(1)).max(20).optional().default([]),
  warningSigns: z.array(z.string().min(1)).max(20).optional().default([]),
  description: z.string().max(2000).optional().default(""),
})

export async function reportSymptoms(
  input: unknown,
): Promise<ActionResult<{ alertCreated: boolean }>> {
  try {
    const user = await requireUser()
    const parsed = reportSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const c = (
      await db
        .select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (c.patientUserId !== user.id) throw forbidden()

    const knownWarningKeys = new Set(WARNING_SIGNS.map((w) => w.key))
    const selectedWarnings = data.warningSigns.filter((w) => knownWarningKeys.has(w))
    const isWarning = selectedWarnings.length > 0
    const hasCritical = WARNING_SIGNS.some((w) => w.critical && selectedWarnings.includes(w.key))

    let alertId: string | null = null
    await db.transaction(async (tx) => {
      const rows = await tx
        .insert(symptomReport)
        .values({
          caseId: c.id,
          patientUserId: user.id,
          symptoms: [...data.symptoms, ...selectedWarnings],
          description: data.description || null,
          isWarningSign: isWarning,
        })
        .returning({ id: symptomReport.id })

      if (isWarning) {
        const labels = selectedWarnings
          .map((k) => WARNING_SIGNS.find((w) => w.key === k)?.labelAr ?? k)
          .join("، ")
        alertId = await createSafetyAlertInternal(
          {
            caseId: c.id,
            patientUserId: user.id,
            severity: hasCritical ? "CRITICAL" : "HIGH",
            summary: `أعراض تحذيرية أبلغ عنها المريض: ${labels}`,
            symptomReportId: rows[0].id,
          },
          user.id,
          tx,
        )
      }
    })

    if (alertId) await notifySafetyAlertRecipientsInternal(alertId)

    revalidatePath(`/dashboard/cases/${c.id}`)
    return { ok: true, data: { alertCreated: Boolean(alertId) } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── Care team: acknowledge / contact / review / resolve ────────────────── */
async function loadAlert(alertId: string) {
  const row = (
    await db.select().from(safetyAlert).where(eq(safetyAlert.id, alertId)).limit(1)
  )[0]
  if (!row) throw new AppError("NOT_FOUND")
  return row
}

export async function acknowledgeSafetyAlert(alertId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const alert = await loadAlert(alertId)
    if (alert.status !== "OPEN") throw conflict("تم الإقرار بهذا التنبيه بالفعل.")

    await db.transaction(async (tx) => {
      await tx.update(safetyAlert).set({ status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedBy: user.id }).where(eq(safetyAlert.id, alertId))
      await writeAudit({ action: "safety_alert.acknowledge", actorUserId: user.id, entityType: "safety_alert", entityId: alertId }, tx)
    })
    revalidatePath(`/dashboard/cases/${alert.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function markPatientContacted(alertId: string, notes?: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const alert = await loadAlert(alertId)
    if (alert.status !== "ACKNOWLEDGED") throw conflict("يجب الإقرار بالتنبيه أولًا.")

    await db.transaction(async (tx) => {
      await tx.update(safetyAlert).set({ status: "CONTACTED" }).where(eq(safetyAlert.id, alertId))
      await writeAudit({ action: "safety_alert.contacted", actorUserId: user.id, entityType: "safety_alert", entityId: alertId, metadata: { notes } }, tx)
    })
    revalidatePath(`/dashboard/cases/${alert.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function markProviderReviewed(alertId: string, notes?: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const alert = await loadAlert(alertId)
    if (alert.status !== "CONTACTED") throw conflict("يجب التواصل مع المريض أولًا.")

    await db.transaction(async (tx) => {
      await tx.update(safetyAlert).set({ status: "PROVIDER_REVIEWED" }).where(eq(safetyAlert.id, alertId))
      await writeAudit({ action: "safety_alert.provider_reviewed", actorUserId: user.id, entityType: "safety_alert", entityId: alertId, metadata: { notes } }, tx)
    })
    revalidatePath(`/dashboard/cases/${alert.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const resolveSchema = z.object({
  alertId: z.string().min(1),
  outcome: z.enum(["RESOLVED", "REFERRED_TO_EMERGENCY", "FALSE_ALARM"]),
  notes: z.string().max(2000).optional().default(""),
})

/** REFERRED_TO_EMERGENCY is allowed from any open state — an emergency must never be blocked by process. */
export async function resolveSafetyAlert(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const parsed = resolveSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data
    const alert = await loadAlert(data.alertId)

    const OPEN_STATES = ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED"]
    if (!OPEN_STATES.includes(alert.status)) throw conflict("هذا التنبيه مغلق بالفعل.")
    if (data.outcome !== "REFERRED_TO_EMERGENCY" && alert.status === "OPEN")
      throw conflict("يجب الإقرار بالتنبيه قبل إغلاقه.")

    await db.transaction(async (tx) => {
      await tx
        .update(safetyAlert)
        .set({
          status: data.outcome,
          resolvedAt: new Date(),
          resolvedBy: user.id,
          resolutionNotes: data.notes || null,
        })
        .where(eq(safetyAlert.id, data.alertId))
      await writeAudit(
        { action: `safety_alert.${data.outcome.toLowerCase()}`, actorUserId: user.id, entityType: "safety_alert", entityId: data.alertId },
        tx,
      )
    })

    revalidatePath(`/dashboard/cases/${alert.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

/* ── Staff: create an alert directly (not via a patient symptom report) ── */
const manualCreateSchema = z.object({
  caseId: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  summary: z.string().min(3).max(2000),
  assignedTo: z.string().min(1).optional(),
})

export async function createSafetyAlertManual(input: unknown): Promise<ActionResult<{ alertId: string }>> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const parsed = manualCreateSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const c = (
      await db
        .select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId })
        .from(aestheticCase)
        .where(eq(aestheticCase.id, data.caseId))
        .limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")

    let alertId = ""
    await db.transaction(async (tx) => {
      alertId = await createSafetyAlertInternal(
        { caseId: c.id, patientUserId: c.patientUserId, severity: data.severity, summary: data.summary },
        user.id,
        tx,
      )
      if (data.assignedTo) {
        await tx.update(safetyAlert).set({ assignedTo: data.assignedTo }).where(eq(safetyAlert.id, alertId))
        await writeAudit({ action: "safety_alert.assign", actorUserId: user.id, entityType: "safety_alert", entityId: alertId, metadata: { assignedTo: data.assignedTo } }, tx)
      }
    })

    await notifySafetyAlertRecipientsInternal(alertId)
    // The recipient fan-out above only covers the case's doctor/center
    // staff/concierges — an explicit assignee (e.g. a compliance reviewer)
    // may not be any of those and would otherwise hear nothing.
    if (data.assignedTo && data.assignedTo !== user.id) {
      const severityLabel: Record<string, string> = {
        LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", CRITICAL: "حرجة",
      }
      await notify({
        userId: data.assignedTo,
        type: "safety_alert.assigned",
        title: `تم إسناد تنبيه سلامة إليك (${severityLabel[data.severity] ?? data.severity})`,
        body: data.summary,
        caseId: c.id,
        href: `/dashboard/cases/${c.id}`,
      })
    }
    revalidatePath(`/dashboard/cases/${c.id}`)
    revalidatePath("/admin/safety-alerts")
    return { ok: true, data: { alertId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const assignSchema = z.object({
  alertId: z.string().min(1),
  assignedTo: z.string().min(1),
})

export async function assignSafetyAlert(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SAFETY_ALERT_MANAGE)
    const parsed = assignSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data
    const alert = await loadAlert(data.alertId)

    await db.transaction(async (tx) => {
      await tx.update(safetyAlert).set({ assignedTo: data.assignedTo }).where(eq(safetyAlert.id, data.alertId))
      await writeAudit({ action: "safety_alert.assign", actorUserId: user.id, entityType: "safety_alert", entityId: data.alertId, metadata: { assignedTo: data.assignedTo } }, tx)
    })

    // The assignee otherwise only finds out by checking the dashboard
    // themselves — for a safety-triage queue that's a real gap, not polish.
    if (data.assignedTo !== user.id) {
      const severityLabel: Record<string, string> = {
        LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", CRITICAL: "حرجة",
      }
      await notify({
        userId: data.assignedTo,
        type: "safety_alert.assigned",
        title: `تم إسناد تنبيه سلامة إليك (${severityLabel[alert.severity] ?? alert.severity})`,
        body: alert.summary ?? undefined,
        caseId: alert.caseId,
        href: `/dashboard/cases/${alert.caseId}`,
      })
    }

    revalidatePath(`/dashboard/cases/${alert.caseId}`)
    revalidatePath("/admin/safety-alerts")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
