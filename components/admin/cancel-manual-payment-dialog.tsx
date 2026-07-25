"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TriangleAlert } from "lucide-react"
import { FormDialog } from "@/components/ui/form-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cancelManualPayment } from "@/lib/actions/payment"

/**
 * Super-Admin-only "undo" for a manual payment: reverts the payment to
 * CANCELLED and the appointment back to PENDING_PAYMENT. The trigger's
 * visibility (manual + PAID + super admin) is decided by the caller —
 * `cancelManualPayment` re-checks the role and every precondition anyway.
 */
export function CancelManualPaymentDialog({
  paymentId,
  appointmentReference,
  trigger,
}: {
  paymentId: string
  appointmentReference: string
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setReason("")
    setError(null)
  }

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await cancelManualPayment({ paymentId, reason })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(`تم إلغاء الدفعة اليدوية للموعد ${appointmentReference}.`)
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
        title="إلغاء الدفعة اليدوية"
        description={`الموعد ${appointmentReference} — سيعود إلى "بانتظار الدفع" فورًا. هذا الإجراء لإصلاح خطأ في التسجيل، وليس استردادًا ماليًا.`}
        preventClose={busy}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void onSubmit()}
              disabled={busy || reason.trim().length < 5}
              loading={busy}
            >
              إلغاء الدفعة
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            سيتحول الموعد إلى «بانتظار الدفع» وسيُخطَر المريض. استخدم هذا فقط لتصحيح دفعة سُجّلت
            بالخطأ — إن كان المطلوب استرداد مالي فعلي، استخدم مسار الاسترداد بدلًا من هذا.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cmp-reason">سبب الإلغاء</Label>
            <Textarea
              id="cmp-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تسجيل مكرر بالخطأ، مبلغ غير صحيح، ..."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </FormDialog>
    </>
  )
}
