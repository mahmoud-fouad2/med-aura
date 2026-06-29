import { conflict } from "@/lib/errors"
import { ROLES, type RoleKey } from "@/lib/rbac"

/**
 * Central case state machine. The ONLY authority for which case-status
 * transitions are legal. Server actions must call {@link assertCaseTransition}
 * before changing `aesthetic_case.status`; no transition outside this map is
 * ever allowed (section 23).
 */
export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "MATCHING"
  | "SHARED_WITH_PROVIDER"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "CONSULTATION_REQUIRED"
  | "CONSULTATION_BOOKED"
  | "CONSULTATION_COMPLETED"
  | "TREATMENT_PLAN_ISSUED"
  | "QUOTE_ISSUED"
  | "PATIENT_REVIEWING"
  | "QUOTE_ACCEPTED"
  | "DEPOSIT_PAID"
  | "MEDICALLY_APPROVED"
  | "CENTER_CONFIRMED"
  | "FULLY_PAID"
  | "PROCEDURE_CONFIRMED"
  | "PROCEDURE_COMPLETED"
  | "FOLLOW_UP"
  | "CLOSED"
  | "CANCELLED"

type Transition = {
  to: CaseStatus
  /** Roles that may trigger this transition. `"system"` = trusted server only
   * (e.g. payment webhook). Empty/undefined = any authorized caller. */
  roles?: (RoleKey | "system")[]
}

const T: Record<CaseStatus, Transition[]> = {
  DRAFT: [{ to: "SUBMITTED", roles: [ROLES.PATIENT] }, { to: "CANCELLED" }],
  SUBMITTED: [
    { to: "MATCHING" },
    { to: "SHARED_WITH_PROVIDER", roles: [ROLES.PATIENT] },
    { to: "CANCELLED" },
  ],
  MATCHING: [{ to: "SHARED_WITH_PROVIDER" }, { to: "CANCELLED" }],
  SHARED_WITH_PROVIDER: [
    { to: "UNDER_REVIEW" },
    { to: "CONSULTATION_REQUIRED" },
    { to: "CONSULTATION_BOOKED" },
    { to: "MORE_INFORMATION_REQUIRED" },
    { to: "CANCELLED" },
  ],
  UNDER_REVIEW: [
    { to: "MORE_INFORMATION_REQUIRED" },
    { to: "CONSULTATION_REQUIRED" },
    { to: "CONSULTATION_BOOKED" },
    { to: "CANCELLED" },
  ],
  MORE_INFORMATION_REQUIRED: [
    { to: "SHARED_WITH_PROVIDER" },
    { to: "UNDER_REVIEW" },
    { to: "CONSULTATION_BOOKED" },
    { to: "CANCELLED" },
  ],
  CONSULTATION_REQUIRED: [
    { to: "CONSULTATION_BOOKED" },
    { to: "CANCELLED" },
  ],
  // set by the verified payment webhook when the consultation fee is paid
  CONSULTATION_BOOKED: [
    { to: "CONSULTATION_COMPLETED", roles: [ROLES.DOCTOR] },
    { to: "CANCELLED" },
  ],
  CONSULTATION_COMPLETED: [
    { to: "TREATMENT_PLAN_ISSUED", roles: [ROLES.DOCTOR] },
    { to: "MORE_INFORMATION_REQUIRED", roles: [ROLES.DOCTOR] },
    { to: "CLOSED", roles: [ROLES.DOCTOR] }, // NOT_SUITABLE / referred
    { to: "CANCELLED" },
  ],
  TREATMENT_PLAN_ISSUED: [
    {
      to: "QUOTE_ISSUED",
      roles: [ROLES.CENTER_OWNER, ROLES.CENTER_ADMIN, ROLES.SUPER_ADMIN],
    },
    { to: "MORE_INFORMATION_REQUIRED", roles: [ROLES.DOCTOR] },
    { to: "CANCELLED" },
  ],
  QUOTE_ISSUED: [
    { to: "PATIENT_REVIEWING", roles: [ROLES.PATIENT] },
    { to: "QUOTE_ACCEPTED", roles: [ROLES.PATIENT] },
    { to: "CANCELLED" },
  ],
  PATIENT_REVIEWING: [
    { to: "QUOTE_ACCEPTED", roles: [ROLES.PATIENT] },
    { to: "QUOTE_ISSUED" }, // superseded → new quote
    { to: "CANCELLED" },
  ],
  // DEPOSIT_PAID is reached only via the verified payment webhook
  QUOTE_ACCEPTED: [{ to: "DEPOSIT_PAID", roles: ["system"] }, { to: "CANCELLED" }],
  DEPOSIT_PAID: [
    { to: "MEDICALLY_APPROVED", roles: [ROLES.DOCTOR] },
    { to: "CANCELLED" },
  ],
  MEDICALLY_APPROVED: [
    {
      to: "CENTER_CONFIRMED",
      roles: [ROLES.CENTER_OWNER, ROLES.CENTER_ADMIN, ROLES.CENTER_STAFF, ROLES.SUPER_ADMIN],
    },
    { to: "CANCELLED" },
  ],
  CENTER_CONFIRMED: [
    { to: "PROCEDURE_CONFIRMED", roles: [ROLES.PATIENT, ROLES.CENTER_ADMIN, ROLES.CENTER_OWNER, ROLES.SUPER_ADMIN] },
    { to: "CANCELLED" },
  ],
  PROCEDURE_CONFIRMED: [
    {
      to: "PROCEDURE_COMPLETED",
      roles: [ROLES.CENTER_OWNER, ROLES.CENTER_ADMIN, ROLES.CENTER_STAFF, ROLES.SUPER_ADMIN],
    },
    { to: "CANCELLED" },
  ],
  PROCEDURE_COMPLETED: [{ to: "FOLLOW_UP" }, { to: "FULLY_PAID" }, { to: "CLOSED" }],
  FOLLOW_UP: [{ to: "FULLY_PAID" }, { to: "CLOSED" }],
  FULLY_PAID: [{ to: "FOLLOW_UP" }, { to: "CLOSED" }],
  CLOSED: [],
  CANCELLED: [],
}

export function allowedNextStates(from: CaseStatus): CaseStatus[] {
  return (T[from] ?? []).map((t) => t.to)
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return (T[from] ?? []).some((t) => t.to === to)
}

/** Does a transition exist AND is it permitted for one of the caller's roles? */
export function canRoleTransition(
  from: CaseStatus,
  to: CaseStatus,
  roles: (RoleKey | "system")[],
): boolean {
  const tr = (T[from] ?? []).find((t) => t.to === to)
  if (!tr) return false
  if (!tr.roles || tr.roles.length === 0) return true
  if (roles.includes(ROLES.SUPER_ADMIN)) return true
  return tr.roles.some((r) => roles.includes(r))
}

/** Throw CONFLICT if the transition is not allowed. Use before persisting. */
export function assertCaseTransition(
  from: CaseStatus,
  to: CaseStatus,
): void {
  if (from === to) return
  if (!canTransition(from, to)) {
    throw conflict(
      `انتقال غير مسموح لحالة الملف من ${from} إلى ${to}.`,
    )
  }
}
