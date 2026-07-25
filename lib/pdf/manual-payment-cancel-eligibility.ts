/**
 * Pure eligibility check for reversing a manual/offline payment — unit
 * tested without a database, same pattern as decideManualPaymentEligibility.
 * Only a PAID payment recorded through the manual provider, with no refund
 * request still in flight against it, can be cancelled this way.
 */
export type ManualPaymentCancelDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_found" | "not_manual" | "not_paid" | "blocking_refund" }

export function decideManualPaymentCancelEligibility(input: {
  payment: { provider: string; status: string } | null
  hasBlockingRefund: boolean
}): ManualPaymentCancelDecision {
  if (!input.payment) return { allowed: false, reason: "not_found" }
  if (input.payment.provider !== "manual") return { allowed: false, reason: "not_manual" }
  if (input.payment.status !== "PAID") return { allowed: false, reason: "not_paid" }
  if (input.hasBlockingRefund) return { allowed: false, reason: "blocking_refund" }
  return { allowed: true }
}
