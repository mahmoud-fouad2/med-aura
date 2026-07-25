/**
 * Pure eligibility check for recording a manual/offline payment — unit
 * tested without a database, same pattern as decideVideoAccess /
 * decideInvoiceAccess. Only a PENDING_PAYMENT appointment is eligible;
 * this is the one guard that actually prevents a duplicate payment.
 */
export type ManualPaymentDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_found" | "already_paid_or_confirmed" }

export function decideManualPaymentEligibility(input: {
  appointment: { status: string } | null
}): ManualPaymentDecision {
  if (!input.appointment) return { allowed: false, reason: "not_found" }
  if (input.appointment.status !== "PENDING_PAYMENT") {
    return { allowed: false, reason: "already_paid_or_confirmed" }
  }
  return { allowed: true }
}
