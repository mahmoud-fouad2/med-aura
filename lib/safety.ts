import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  aestheticCase,
  center,
  centerStaff,
  doctorProfile,
  role as roleT,
  safetyAlert,
  userRole,
} from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { ROLES } from "@/lib/rbac"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Internal helper. Never export this from a `"use server"` module. */
export async function createSafetyAlertInternal(
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

/** Internal notification fan-out for an already-authorized safety workflow. */
export async function notifySafetyAlertRecipientsInternal(alertId: string): Promise<void> {
  const alert = (
    await db.select().from(safetyAlert).where(eq(safetyAlert.id, alertId)).limit(1)
  )[0]
  if (!alert) return

  const caseRow = (
    await db
      .select({ doctorId: aestheticCase.doctorId, centerId: aestheticCase.centerId })
      .from(aestheticCase)
      .where(eq(aestheticCase.id, alert.caseId))
      .limit(1)
  )[0]
  if (!caseRow) return

  const recipients = new Set<string>()
  if (caseRow.doctorId) {
    const doctor = (
      await db
        .select({ userId: doctorProfile.userId })
        .from(doctorProfile)
        .where(eq(doctorProfile.id, caseRow.doctorId))
        .limit(1)
    )[0]
    if (doctor) recipients.add(doctor.userId)
  }

  if (caseRow.centerId) {
    const [owner, staff] = await Promise.all([
      db
        .select({ ownerId: center.ownerId })
        .from(center)
        .where(eq(center.id, caseRow.centerId))
        .limit(1),
      db
        .select({ userId: centerStaff.userId })
        .from(centerStaff)
        .where(eq(centerStaff.centerId, caseRow.centerId)),
    ])
    if (owner[0]?.ownerId) recipients.add(owner[0].ownerId)
    for (const member of staff) recipients.add(member.userId)
  }

  const concierges = await db
    .select({ userId: userRole.userId })
    .from(userRole)
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
    .where(eq(roleT.key, ROLES.CONCIERGE))
  for (const concierge of concierges) recipients.add(concierge.userId)

  const severityLabel: Record<string, string> = {
    LOW: "منخفضة",
    MEDIUM: "متوسطة",
    HIGH: "عالية",
    CRITICAL: "حرجة",
  }
  await Promise.all(
    [...recipients].map((userId) =>
      notify({
        userId,
        type: "safety_alert.created",
        title: `تنبيه سلامة (${severityLabel[alert.severity] ?? alert.severity})`,
        body: alert.summary ?? undefined,
        caseId: alert.caseId,
        href: `/dashboard/cases/${alert.caseId}`,
      }),
    ),
  )
}

/** Internal closure gate. The public closure action performs authorization first. */
export async function hasOpenSafetyAlertsInternal(caseId: string): Promise<boolean> {
  const rows = await db
    .select({ id: safetyAlert.id })
    .from(safetyAlert)
    .where(
      and(
        eq(safetyAlert.caseId, caseId),
        inArray(safetyAlert.status, [
          "OPEN",
          "ACKNOWLEDGED",
          "CONTACTED",
          "PROVIDER_REVIEWED",
          "REFERRED_TO_EMERGENCY",
        ]),
      ),
    )
    .limit(1)
  return rows.length > 0
}
