import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { listPayments } from "@/lib/data/finance"
import { writeAudit, requestMeta } from "@/lib/audit"

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Payments CSV export — finance-only. Billing fields only, no medical data. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول." }, { status: 401 })
  if (!(await hasPermission(user.id, PERMISSIONS.FINANCE_ACCESS)))
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 })

  const rows = await listPayments(1000)
  const header = ["المرجع", "الغرض", "الحالة", "المبلغ", "العملة", "المزود", "الدافع", "رقم الحالة", "الإجراء", "تاريخ الإنشاء", "تاريخ الدفع"]
  const lines = [header.join(",")]
  for (const r of rows) {
    lines.push(
      [
        r.reference,
        r.purpose,
        r.status,
        r.amount,
        r.currency,
        r.provider,
        r.payerName,
        r.caseReference ?? "",
        r.procedureName ?? "",
        r.createdAt.toISOString(),
        r.paidAt ? r.paidAt.toISOString() : "",
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    )
  }
  const csv = "﻿" + lines.join("\n") // BOM for Excel Arabic support

  const meta = await requestMeta()
  await writeAudit({ action: "finance.export", actorUserId: user.id, entityType: "payment", metadata: { count: rows.length }, ...meta })

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
