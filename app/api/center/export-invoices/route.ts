import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { invoice, aestheticCase } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { canAccessCenter } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { logger } from "@/lib/logger"

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ""
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const centerId = searchParams.get("centerId")
    if (!centerId) return NextResponse.json({ error: "رقم المركز مطلوب" }, { status: 400 })

    // Same authorization every other center-scoped route in the app uses:
    // super admin, the center's owner, or its staff — not just the literal
    // owner (a center_admin/center_staff member legitimately needs this too).
    if (!(await canAccessCenter(user.id, centerId))) {
      return NextResponse.json({ error: "لا تملك صلاحية التصدير لهذا المركز" }, { status: 403 })
    }

    const rows = await db
      .select({
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: invoice.total,
        remainingAmount: invoice.remainingAmount,
        currency: invoice.currency,
        issueDate: invoice.issueDate,
        caseId: aestheticCase.id,
      })
      .from(invoice)
      .innerJoin(aestheticCase, eq(invoice.caseId, aestheticCase.id))
      .where(eq(aestheticCase.centerId, centerId))

    const header = ["رقم الفاتورة", "رقم الحالة", "المبلغ الإجمالي", "المبلغ المتبقي", "العملة", "الحالة", "تاريخ الإصدار"]
    const lines = [header.join(",")]
    
    for (const r of rows) {
      lines.push(
        [
          r.invoiceNumber,
          r.caseId,
          r.totalAmount,
          r.remainingAmount,
          r.currency,
          r.status,
          r.issueDate ? r.issueDate.toISOString() : ""
        ].map(csvEscape).join(",")
      )
    }

    const csv = "\uFEFF" + lines.join("\n") // BOM for Excel Arabic support
    
    const meta = await requestMeta()
    await writeAudit({ action: "center.export_invoices", actorUserId: user.id, entityType: "center", entityId: centerId, metadata: { count: rows.length }, ...meta })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-${centerId}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (err) {
    logger.error("center.export_invoices failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 })
  }
}
