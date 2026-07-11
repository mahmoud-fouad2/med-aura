"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { Undo2 } from "lucide-react"
import { reviewRefundRequest, providerConfirmRefund, processRefund } from "@/lib/actions/refund"
import { currencyAr, refundStatusAr } from "@/lib/status-labels"
import type { FinanceRefundRow } from "@/lib/data/finance"

export function RefundReviewPanel({ refunds }: { refunds: FinanceRefundRow[] }) {
  if (refunds.length === 0) {
    return <EmptyState icon={Undo2} title="لا توجد طلبات استرجاع" description="ستظهر هنا طلبات الاسترجاع عند تقديمها." />
  }
  return (
    <div className="space-y-3">
      {refunds.map((r) => (
        <RefundCard key={r.id} refund={r} />
      ))}
    </div>
  )
}

function RefundCard({ refund }: { refund: FinanceRefundRow }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true)
    setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "حدث خطأ")
    router.refresh()
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {refund.requestedByName} — {Number(refund.amount).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(refund.currency)}
          </p>
          <Link href={`/dashboard/cases/${refund.caseId}`} className="text-xs text-primary hover:underline">
            فاتورة {refund.invoiceNumber}
          </Link>
        </div>
        <Badge variant="outline">{refundStatusAr(refund.status)}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{refund.reason}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {["REQUESTED", "UNDER_REVIEW"].includes(refund.status) && (
        <div className="space-y-2 border-t border-border pt-3">
          <Textarea rows={2} placeholder="ملاحظات المراجعة (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => run(() => reviewRefundRequest({ refundRequestId: refund.id, decision: "approve", notes }))}>
              موافقة
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => reviewRefundRequest({ refundRequestId: refund.id, decision: "reject", notes }))}>
              رفض
            </Button>
          </div>
        </div>
      )}
      {refund.status === "APPROVED" && (
        <div className="flex gap-2 border-t border-border pt-3">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => providerConfirmRefund(refund.id))}>
            تأكيد مقدّم الخدمة
          </Button>
          <Button size="sm" disabled={busy} onClick={() => run(() => processRefund(refund.id))}>
            معالجة الاسترجاع الآن
          </Button>
        </div>
      )}
      {refund.status === "PROVIDER_CONFIRMED" && (
        <div className="border-t border-border pt-3">
          <Button size="sm" disabled={busy} onClick={() => run(() => processRefund(refund.id))}>
            معالجة الاسترجاع
          </Button>
        </div>
      )}
    </Card>
  )
}
