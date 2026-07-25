"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import { FormDialog } from "@/components/ui/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { recordManualPayment } from "@/lib/actions/payment"

const METHODS = [
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "cash", label: "نقدًا" },
  { value: "pos", label: "شبكة (POS)" },
  { value: "external", label: "بوابة دفع خارجية" },
  { value: "other", label: "أخرى" },
]

/**
 * Finance/Super-Admin-only "Record Offline Payment" modal — the trigger
 * (a button) decides whether it renders at all; this component only
 * assumes it's already permission-gated by its caller.
 */
export function ManualPaymentDialog({
  appointmentId,
  appointmentReference,
  defaultAmount,
  defaultCurrency,
  trigger,
}: {
  appointmentId: string
  appointmentReference: string
  defaultAmount: string | null
  defaultCurrency: string
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState("bank_transfer")
  const [referenceNote, setReferenceNote] = useState("")
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(defaultAmount ?? "")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountDiffers =
    defaultAmount != null && amount !== "" && Number(amount) !== Number(defaultAmount)

  function reset() {
    setMethod("bank_transfer")
    setReferenceNote("")
    setPaidAt(new Date().toISOString().slice(0, 10))
    setAmount(defaultAmount ?? "")
    setCurrency(defaultCurrency)
    setConfirmed(false)
    setError(null)
  }

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await recordManualPayment({
      appointmentId,
      method,
      referenceNote,
      paidAt,
      amount: Number(amount),
      currency,
      confirmed,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(`تم تسجيل الدفعة وتأكيد الموعد ${appointmentReference}.`)
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <>
      <span
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true)
        }}
      >
        {trigger}
      </span>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
        title="تسجيل دفعة خارج البوابة الإلكترونية"
        description={`الموعد ${appointmentReference} — سيتحول تلقائيًا إلى "مؤكَّد" عند الحفظ.`}
        preventClose={busy}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => void onSubmit()}
              disabled={busy || !confirmed || !referenceNote.trim() || !amount}
              loading={busy}
            >
              حفظ وتأكيد الموعد
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <Select
              items={METHODS}
              value={method}
              onValueChange={(v) => setMethod(String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-reference">رقم المرجع / ملاحظة</Label>
            <Textarea
              id="mp-reference"
              rows={2}
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="مثال: تحويل بنكي رقم 123456 بتاريخ ..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mp-date">تاريخ الدفع</Label>
              <Input
                id="mp-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-currency">العملة</Label>
              <Input
                id="mp-currency"
                dir="ltr"
                className="uppercase"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-amount">المبلغ</Label>
            <Input
              id="mp-amount"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountDiffers ? (
              <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                هذا المبلغ يختلف عن رسوم الموعد المسجَّلة ({defaultAmount} {defaultCurrency}) —
                تأكد أنه مقصود قبل الحفظ.
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <span>أؤكد أن هذه الدفعة تم التحقق منها خارجيًا فعليًا وأنها مطابقة للمبلغ المذكور.</span>
          </label>

          {/* Optional proof-of-payment attachment is not implemented in this
              batch — the upload system it would need (presign/finalize + a
              private R2 object) isn't wired up for this form yet. */}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </FormDialog>
    </>
  )
}
