"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Undo2, Lock, LockOpen, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFinalPayment } from "@/lib/actions/payment"
import { requestRefund } from "@/lib/actions/refund"
import { closeCase, reopenCase, type ClosureEligibility } from "@/lib/actions/case-closure"
import { currencyAr, invoiceStatusAr } from "@/lib/status-labels"
import type { InvoiceView } from "@/lib/data/care"

/** Patient: pay the remaining balance shown on the case's invoice. Staff/admin can view the same breakdown read-only. */
export function RemainingBalanceCard({
  caseId,
  invoice,
  readOnly = false,
}: {
  caseId: string
  invoice: InvoiceView
  readOnly?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const remaining = Number(invoice.remainingAmount)

  async function onPay() {
    setBusy(true)
    setError(null)
    const res = await createFinalPayment(caseId)
    if (!res.ok) {
      setBusy(false)
      setError(res.error)
      return
    }
    if (res.data!.paymentConfigured && res.data!.checkoutUrl) {
      window.location.href = res.data!.checkoutUrl
      return
    }
    setBusy(false)
    setNotConfigured(true)
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
          <CreditCard className="size-4 text-primary" /> فاتورة {invoice.invoiceNumber}
        </h3>
        <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
          {invoiceStatusAr(invoice.status)}
        </Badge>
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">الإجمالي</dt>
          <dd className="text-foreground">{Number(invoice.total).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(invoice.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">المدفوع</dt>
          <dd className="text-foreground">{Number(invoice.paidAmount).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(invoice.currency)}</dd>
        </div>
        <div className="flex justify-between font-bold">
          <dt>المتبقي</dt>
          <dd>{remaining.toLocaleString("ar-SA-u-nu-latn")} {currencyAr(invoice.currency)}</dd>
        </div>
      </dl>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {readOnly ? (
        remaining > 0 ? (
          <p className="text-sm text-muted-foreground">بانتظار سداد المريض للمتبقي.</p>
        ) : (
          <p className="text-sm text-success">تم سداد الفاتورة بالكامل.</p>
        )
      ) : notConfigured ? (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" /> بوابة الدفع غير مفعّلة حاليًا.
        </p>
      ) : remaining > 0 ? (
        <Button disabled={busy} onClick={onPay}>
          {busy ? "جارٍ التحويل…" : `سداد المتبقي (${remaining.toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(invoice.currency)})`}
        </Button>
      ) : (
        <p className="text-sm text-success">تم سداد الفاتورة بالكامل.</p>
      )}
    </div>
  )
}

/** Patient/staff: request a refund against the paid amount. */
export function RefundRequestForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await requestRefund({ caseId, amount: Number(amount), reason })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setSent(true)
    router.refresh()
  }

  if (sent) return <p className="text-sm text-success">تم إرسال طلب الاسترجاع، سيراجعه فريق المالية.</p>
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Undo2 className="size-4" /> طلب استرجاع
      </Button>
    )
  }
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="refund-amount">المبلغ المطلوب استرجاعه</Label>
        <Input id="refund-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="refund-reason">السبب</Label>
        <Textarea id="refund-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={onSubmit}>{busy ? "جارٍ الإرسال…" : "إرسال الطلب"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </div>
  )
}

/** Authorized staff: close the case (gated) or reopen a closed one (needs a reason). */
export function CaseClosureControls({
  caseId,
  eligibility,
  isClosed,
}: {
  caseId: string
  eligibility: ClosureEligibility
  isClosed: boolean
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClose() {
    setBusy(true)
    setError(null)
    const res = await closeCase({ caseId, reason })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }
  async function onReopen() {
    if (reason.trim().length < 5) return setError("يجب ذكر سبب إعادة الفتح.")
    setBusy(true)
    setError(null)
    const res = await reopenCase({ caseId, reason })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  if (isClosed) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label htmlFor="reopen-reason">سبب إعادة الفتح</Label>
        <Textarea id="reopen-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button size="sm" variant="outline" disabled={busy} onClick={onReopen}>
          <LockOpen className="size-4" /> إعادة فتح الحالة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {!eligibility.eligible && (
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {eligibility.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      <Textarea rows={2} placeholder="ملاحظة إغلاق (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" variant="outline" disabled={busy || !eligibility.eligible} onClick={onClose}>
        <Lock className="size-4" /> إغلاق الحالة
      </Button>
    </div>
  )
}
