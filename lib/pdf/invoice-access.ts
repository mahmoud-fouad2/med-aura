/**
 * Pure access decision for downloading a payment receipt/invoice PDF —
 * unit-tested without a database, same pattern as decideVideoAccess in
 * lib/video/service.ts. The route wraps this with the DB lookup + the
 * hasPermission() check that can't be pure.
 */
export type InvoiceAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_found" | "not_authorized" }

export function decideInvoiceAccess(input: {
  payment: { payerUserId: string } | null
  viewerId: string | null
  isFinanceOrAdmin: boolean
}): InvoiceAccessDecision {
  if (!input.payment) return { allowed: false, reason: "not_found" }
  if (!input.viewerId) return { allowed: false, reason: "not_authorized" }
  if (input.viewerId === input.payment.payerUserId) return { allowed: true }
  if (input.isFinanceOrAdmin) return { allowed: true }
  // Doctors never get financial data through this route unless they are
  // also the payer — matches "الطبيب لا يرى بيانات مالية إلا لو مصرح".
  return { allowed: false, reason: "not_authorized" }
}
