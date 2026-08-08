import { getCurrentUser } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { getPaymentReceiptData } from "@/lib/data/invoice"
import { decideInvoiceAccess } from "@/lib/pdf/invoice-access"
import { renderInvoiceReceipt } from "@/lib/pdf/invoice-receipt-renderer"
import { writeAudit, requestMeta } from "@/lib/audit"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * Streams a branded PDF receipt/invoice for one payment. The payer always
 * has access to their own; finance/admin can access any. Doctors and other
 * patients get the same 404 as a payment that doesn't exist — this route
 * never reveals whether a payment id is valid to someone who can't see it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params
  const user = await getCurrentUser()
  const data = await getPaymentReceiptData(paymentId)

  const isFinanceOrAdmin = user
    ? (await hasPermission(user.id, PERMISSIONS.FINANCE_ACCESS)) ||
      (await hasPermission(user.id, PERMISSIONS.PAYMENT_READ_ANY))
    : false

  const decision = decideInvoiceAccess({
    payment: data ? { payerUserId: data.payerUserId } : null,
    viewerId: user?.id ?? null,
    isFinanceOrAdmin,
  })

  if (!decision.allowed || !data) {
    // "not_authorized" and "not_found" both render as a plain 404 — an
    // outsider learns nothing about whether the payment id exists.
    return new Response("Not found.", { status: 404 })
  }

  // The receipt uses a direct PDFKit document per request. This intentionally
  // avoids React-PDF TextKit's stateful bidi layout, which could fail after a
  // Latin receipt followed by an Arabic one in the same server process.
  let buffer: Buffer
  try {
    buffer = await renderInvoiceReceipt(data)
  } catch (err) {
    logger.error("invoice pdf render failed", {
      paymentId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    return new Response("Receipt could not be generated.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  const meta = await requestMeta()
  await writeAudit({
    action: "invoice.downloaded",
    actorUserId: user!.id,
    entityType: "payment",
    entityId: data.paymentId,
    metadata: { reference: data.reference },
    ...meta,
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="med-aura-receipt-${data.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
