"use server"

import { z } from "zod"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  aestheticCase,
  symptomReport,
  safetyAlert,
  doctorProfile,
  center,
  centerStaff,
  userRole,
  role as roleT,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden, conflict } from "@/lib/errors"
import { WARNING_SIGNS } from "@/lib/care/warning-signs"
import type { ActionResult } from "@/lib/actions/provider"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Pure DB write — insert a safety alert. Callable inside an existing transaction. */
export async function createSafetyAlert(
  input: {
    caseId: string
    patientUserId: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    summary: string
    symptomReportId?: string
  },
  actorUserId: string | null,
  tx?: Tx,
): Promise<string> {
  const runner = tx ?? db
  const rows = await runner
    .insert(safetyAlert)
    .values({
      caseId: input.caseId,
      patientUserId: input.patientUserId,
      symptomReportId: input.symptomReportId,
      severity: input.severity,
      status: "OPEN",
      summary: input.summary,
    })
    .returning({ id: safetyAlert.id })
  await writeAudit(
    {
      action: "safety_alert.create",
      actorUserId,
      entityType: "safety_alert",
      entityId: rows[0].id,
      metadata: { caseId: input.caseId, severity: input.severity },
    },
    tx,
  )
  return rows[0].id
}

/** Best-effort notification fan-out to the case's doctor, center staff, and concierge. */
export async function notifySafetyAlertRecipients(alertId: string): Promise<void> {
  const alert = (
    await db.select().from(safetyAlert).where(eq(safetyAlert.id, alertId)).limit(1)
  )[0]
  if (!alert) return
  const c = (
    await db
      .select({ id: aestheticCase.id, doctorId: aestheticCase.doctorId, centerId: aestheticCase.centerId })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, alert.caseId))
      .limit(1)
  )[0]
  if (!c) return

  const recipients = new Set<string>()

  if (c.doctorId) {
    const doc = (
      await db.select({ userId: doctorProfile.userId }).from(doctorProfile).where(eq(doctorProfile.id, c.doctorId)).limit(1)
    )[0]
    if (doc) recipients.add(doc.userId)
  }
  if (c.centerId) {
    const [owner, staff] = await Promise.all([
      db.select({ ownerId: center.ownerId }).from(center).where(eq(center.id, c.centerId)).limit(1),
      db.select({ userId: centerStaff.userId }).from(centerStaff).where(eq(centerStaff.centerId, c.centerId)),
    ])
    if (owner[0]?.ownerId) recipients.add(owner[0].ownerId)
    for (const s of staff) recipients.add(s.userId)
  }
  const concierges = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
    .where(eq(roleT.key, ROLES.CONCIERGE))
  for (const cn of concierges) recipients.add(cn.userId)

  const severityLabel: Record<string, string> = {
    LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", CRITICAL: "حرجة",
  }
  for (const userId of recipients) {
    await notify({
      userId,
      type: "safety_alert.created",
      title: `تنبيه سلامة (${severityLabel[alert.severity] ?? alert.severity})`,
      body: alert.summary ?? undefined,
      caseId: alert.caseId,
      href: `/dashboard/cases/${alert.caseId}`,
    })
  }
}

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
        alertId = await createSafetyAlert(
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

    if (alertId) await notifySafetyAlertRecipients(alertId)

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

/** Unresolved alerts for a case — used to gate case closure. */
export async function hasOpenSafetyAlerts(caseId: string): Promise<boolean> {
  const rows = await db
    .select({ id: safetyAlert.id })
    .from(safetyAlert)
    .where(
      and(
        eq(safetyAlert.caseId, caseId),
        inArray(safetyAlert.status, ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "REFERRED_TO_EMERGENCY"]),
      ),
    )
    .limit(1)
  return rows.length > 0
}
