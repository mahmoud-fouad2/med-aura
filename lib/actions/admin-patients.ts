"use server"

import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listPatientCases, listPatientNotifications, type PatientCaseRow, type PatientNotificationRow } from "@/lib/data/admin-patient-detail"
import { listMyPayments, type MyPaymentRow } from "@/lib/data/invoice"

/**
 * Read-only lookups behind the Patients admin drawer's clinical/billing/
 * notifications tabs. Gated by USER_READ_ANY — the same permission that
 * already lets an admin see the patient list itself; nothing here mutates
 * data, so no audit entry (matches getUserActivityAction's precedent).
 */

export async function getPatientCasesAction(
  userId: string,
): Promise<{ status: "ok"; rows: PatientCaseRow[] } | { status: "error"; message: string }> {
  await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const rows = await listPatientCases(userId)
  return { status: "ok", rows }
}

export async function getPatientPaymentsAction(
  userId: string,
): Promise<{ status: "ok"; rows: MyPaymentRow[] } | { status: "error"; message: string }> {
  await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const rows = await listMyPayments(userId)
  return { status: "ok", rows }
}

export async function getPatientNotificationsAction(
  userId: string,
): Promise<{ status: "ok"; rows: PatientNotificationRow[] } | { status: "error"; message: string }> {
  await requirePermissionOrThrow(PERMISSIONS.USER_READ_ANY)
  const rows = await listPatientNotifications(userId)
  return { status: "ok", rows }
}
