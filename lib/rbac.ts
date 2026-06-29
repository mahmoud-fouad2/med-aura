import { and, eq, isNull, or, gt } from "drizzle-orm"
import { db } from "./db"
import {
  user,
  userRole,
  role,
  doctorProfile,
  aestheticCase,
  medicalDocument,
  documentAccessGrant,
  consent,
} from "./db/schema"
import { forbidden, unauthorized } from "./errors"

/* ── Canonical roles (section 13) ─────────────────────────────────────────── */
export const ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  CENTER_OWNER: "center_owner",
  CENTER_ADMIN: "center_admin",
  CENTER_STAFF: "center_staff",
  CONCIERGE: "concierge",
  COMPLIANCE_REVIEWER: "compliance_reviewer",
  FINANCE_ADMIN: "finance_admin",
  SUPPORT_AGENT: "support_agent",
  CONTENT_ADMIN: "content_admin",
  SUPER_ADMIN: "super_admin",
} as const
export type RoleKey = (typeof ROLES)[keyof typeof ROLES]

/* ── Permissions ──────────────────────────────────────────────────────────── */
export const PERMISSIONS = {
  PROVIDER_APPLY: "provider:apply",
  PROVIDER_REVIEW: "provider:review",
  PROVIDER_APPROVE: "provider:approve",
  PROVIDER_SUSPEND: "provider:suspend",

  CASE_CREATE: "case:create",
  CASE_READ_OWN: "case:read:own",
  CASE_READ_ASSIGNED: "case:read:assigned",
  CASE_READ_ANY: "case:read:any",

  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_READ_OWN: "document:read:own",
  DOCUMENT_READ_GRANTED: "document:read:granted",
  DOCUMENT_READ_ANY: "document:read:any",

  CONSENT_GRANT: "consent:grant",
  CONSENT_REVOKE: "consent:revoke",

  APPOINTMENT_BOOK: "appointment:book",
  APPOINTMENT_READ_OWN: "appointment:read:own",
  APPOINTMENT_READ_ASSIGNED: "appointment:read:assigned",
  APPOINTMENT_READ_ANY: "appointment:read:any",
  APPOINTMENT_CONFIRM: "appointment:confirm",
  APPOINTMENT_CANCEL: "appointment:cancel",

  PAYMENT_CREATE: "payment:create",
  PAYMENT_READ_OWN: "payment:read:own",
  PAYMENT_READ_ANY: "payment:read:any",

  QUOTE_WRITE: "quote:write",
  MEDICAL_APPROVE: "medical:approve",
  PROCEDURE_CONFIRM: "procedure:confirm",
  PROCEDURE_COMPLETE: "procedure:complete",
  INVOICE_WRITE: "invoice:write",

  CATALOG_READ: "catalog:read",
  CATALOG_MANAGE: "catalog:manage",

  ADMIN_ACCESS: "admin:access",
  COMPLIANCE_ACCESS: "compliance:access",
  USER_READ_ANY: "user:read:any",
  ROLE_ASSIGN: "role:assign",
  AUDIT_READ: "audit:read",
} as const
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const P = PERMISSIONS

/** Role → permissions. Seeded into role_permission from this single source. */
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  [ROLES.PATIENT]: [
    P.PROVIDER_APPLY,
    P.CASE_CREATE,
    P.CASE_READ_OWN,
    P.DOCUMENT_UPLOAD,
    P.DOCUMENT_READ_OWN,
    P.CONSENT_GRANT,
    P.CONSENT_REVOKE,
    P.APPOINTMENT_BOOK,
    P.APPOINTMENT_READ_OWN,
    P.PAYMENT_CREATE,
    P.PAYMENT_READ_OWN,
    P.CATALOG_READ,
  ],
  [ROLES.DOCTOR]: [
    P.CASE_READ_ASSIGNED,
    P.DOCUMENT_READ_GRANTED,
    P.APPOINTMENT_READ_ASSIGNED,
    P.APPOINTMENT_CONFIRM,
    P.APPOINTMENT_CANCEL,
    P.QUOTE_WRITE,
    P.MEDICAL_APPROVE,
    P.CATALOG_READ,
  ],
  [ROLES.CENTER_OWNER]: [
    P.CASE_READ_ASSIGNED,
    P.APPOINTMENT_READ_ASSIGNED,
    P.APPOINTMENT_CONFIRM,
    P.QUOTE_WRITE,
    P.PROCEDURE_CONFIRM,
    P.PROCEDURE_COMPLETE,
    P.INVOICE_WRITE,
    P.PAYMENT_READ_ANY,
    P.CATALOG_READ,
  ],
  [ROLES.CENTER_ADMIN]: [
    P.CASE_READ_ASSIGNED,
    P.APPOINTMENT_READ_ASSIGNED,
    P.APPOINTMENT_CONFIRM,
    P.QUOTE_WRITE,
    P.PROCEDURE_CONFIRM,
    P.PROCEDURE_COMPLETE,
    P.INVOICE_WRITE,
    P.CATALOG_READ,
  ],
  [ROLES.CENTER_STAFF]: [
    P.APPOINTMENT_READ_ASSIGNED,
    P.PROCEDURE_COMPLETE,
    P.CATALOG_READ,
  ],
  [ROLES.CONCIERGE]: [
    P.CASE_READ_ANY,
    P.APPOINTMENT_READ_ANY,
    P.CATALOG_READ,
  ],
  [ROLES.COMPLIANCE_REVIEWER]: [
    P.COMPLIANCE_ACCESS,
    P.PROVIDER_REVIEW,
    P.PROVIDER_APPROVE,
    P.PROVIDER_SUSPEND,
    P.USER_READ_ANY,
    P.AUDIT_READ,
    P.CATALOG_READ,
  ],
  [ROLES.FINANCE_ADMIN]: [P.PAYMENT_READ_ANY, P.AUDIT_READ, P.CATALOG_READ],
  [ROLES.SUPPORT_AGENT]: [
    P.CASE_READ_ANY,
    P.APPOINTMENT_READ_ANY,
    P.CATALOG_READ,
  ],
  [ROLES.CONTENT_ADMIN]: [P.CATALOG_MANAGE, P.CATALOG_READ],
  // Super admin gets everything via the wildcard in hasPermission().
  [ROLES.SUPER_ADMIN]: [],
}

/* ── DB-backed role/permission resolution ─────────────────────────────────── */

/** Authoritative role keys for a user (from user_role; falls back to user.role). */
export async function getUserRoles(userId: string): Promise<RoleKey[]> {
  const rows = await db
    .select({ key: role.key })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, userId))

  if (rows.length > 0) return rows.map((r) => r.key as RoleKey)

  // Resilience: if no rows yet, use the denormalised primary role.
  const u = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return u[0] ? [u[0].role as RoleKey] : []
}

/** Pure: permissions for a set of role keys (super_admin = wildcard). */
export function computePermissions(roleKeys: RoleKey[]): Set<PermissionKey> {
  if (roleKeys.includes(ROLES.SUPER_ADMIN)) {
    return new Set(Object.values(PERMISSIONS))
  }
  const perms = new Set<PermissionKey>()
  for (const r of roleKeys) {
    for (const p of ROLE_PERMISSIONS[r] ?? []) perms.add(p)
  }
  return perms
}

/** Pure: does any of these roles grant the permission? */
export function rolesHavePermission(
  roleKeys: RoleKey[],
  perm: PermissionKey,
): boolean {
  if (roleKeys.includes(ROLES.SUPER_ADMIN)) return true
  return roleKeys.some((r) => (ROLE_PERMISSIONS[r] ?? []).includes(perm))
}

export async function getUserPermissions(
  userId: string,
): Promise<Set<PermissionKey>> {
  return computePermissions(await getUserRoles(userId))
}

export async function hasRole(userId: string, r: RoleKey): Promise<boolean> {
  return (await getUserRoles(userId)).includes(r)
}

export async function hasPermission(
  userId: string,
  perm: PermissionKey,
): Promise<boolean> {
  return rolesHavePermission(await getUserRoles(userId), perm)
}

/** Throws ForbiddenError unless the user holds the permission. */
export async function requirePermission(
  userId: string | undefined | null,
  perm: PermissionKey,
): Promise<void> {
  if (!userId) throw unauthorized()
  if (!(await hasPermission(userId, perm))) throw forbidden()
}

/* ── Resource-level authorization (server-side; not just hidden buttons) ───── */

/**
 * Case access: owner (patient), admins/concierge (case:read:any), or the
 * assigned doctor WITH an active consent for that case.
 */
export async function canAccessCase(
  userId: string,
  caseId: string,
): Promise<boolean> {
  const rows = await db
    .select({
      patientUserId: aestheticCase.patientUserId,
      doctorUserId: doctorProfile.userId,
    })
    .from(aestheticCase)
    .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
    .where(eq(aestheticCase.id, caseId))
    .limit(1)

  const row = rows[0]
  if (!row) return false
  if (row.patientUserId === userId) return true
  if (await hasPermission(userId, PERMISSIONS.CASE_READ_ANY)) return true

  if (row.doctorUserId === userId) {
    const active = await db
      .select({ id: consent.id })
      .from(consent)
      .where(
        and(
          eq(consent.caseId, caseId),
          eq(consent.granteeUserId, userId),
          eq(consent.status, "GRANTED"),
          or(isNull(consent.expiresAt), gt(consent.expiresAt, new Date())),
        ),
      )
      .limit(1)
    return active.length > 0
  }
  return false
}

/**
 * Document access: owner, admins (document:read:any), or a grantee with an
 * active access grant tied to a still-GRANTED, non-expired consent. Revoking
 * the consent or the grant immediately blocks future reads.
 */
export async function canViewDocument(
  userId: string,
  documentId: string,
): Promise<boolean> {
  const docRows = await db
    .select({ ownerUserId: medicalDocument.ownerUserId })
    .from(medicalDocument)
    .where(eq(medicalDocument.id, documentId))
    .limit(1)
  const doc = docRows[0]
  if (!doc) return false
  if (doc.ownerUserId === userId) return true
  if (await hasPermission(userId, PERMISSIONS.DOCUMENT_READ_ANY)) return true

  const granted = await db
    .select({ id: documentAccessGrant.id })
    .from(documentAccessGrant)
    .innerJoin(consent, eq(documentAccessGrant.consentId, consent.id))
    .where(
      and(
        eq(documentAccessGrant.documentId, documentId),
        eq(documentAccessGrant.granteeUserId, userId),
        isNull(documentAccessGrant.revokedAt),
        eq(consent.status, "GRANTED"),
        or(isNull(consent.expiresAt), gt(consent.expiresAt, new Date())),
      ),
    )
    .limit(1)
  return granted.length > 0
}
