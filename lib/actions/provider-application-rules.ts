/**
 * Pure state-machine rules for provider applications, kept separate from
 * provider.ts so they're testable without a DB/session. Mirrors the pattern
 * in lib/pdf/manual-payment-eligibility.ts.
 */

const OPEN_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] as const
const DECIDED_STATUSES = ["APPROVED", "REJECTED"] as const

export type ApplicationDecisionEligibility =
  | { allowed: true }
  | { allowed: false; reason: "not_found" | "already_decided" }

/** Gates approve/reject/request-changes — a decided application is final. */
export function decideApplicationDecisionEligibility(input: {
  application: { status: string } | null
}): ApplicationDecisionEligibility {
  if (!input.application) return { allowed: false, reason: "not_found" }
  if ((DECIDED_STATUSES as readonly string[]).includes(input.application.status))
    return { allowed: false, reason: "already_decided" }
  return { allowed: true }
}

export type ApplicationResubmitEligibility =
  | { allowed: true; mode: "insert" | "update" }
  | { allowed: false; reason: "already_open" }

/**
 * Gates a new submitDoctorApplication/submitCenterApplication call:
 * - no prior application, or a fully resolved one (approved/rejected/
 *   suspended/expired) → a fresh application ("insert")
 * - "needs changes" → the applicant is editing that same application
 *   ("update"), not starting a new review from zero
 * - anything still open (draft/submitted/under review) → blocked, one
 *   in-flight application per applicant
 */
export function decideApplicationResubmitEligibility(input: {
  existing: { status: string } | null
}): ApplicationResubmitEligibility {
  if (!input.existing) return { allowed: true, mode: "insert" }
  if ((OPEN_STATUSES as readonly string[]).includes(input.existing.status))
    return { allowed: false, reason: "already_open" }
  if (input.existing.status === "NEEDS_CHANGES") return { allowed: true, mode: "update" }
  return { allowed: true, mode: "insert" }
}
