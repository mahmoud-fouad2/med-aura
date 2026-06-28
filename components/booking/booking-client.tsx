"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { bookConsultation } from "@/lib/actions/booking"
import type { Slot } from "@/lib/data/availability"

export function BookingClient({
  doctorId,
  slots,
  caseId,
  paymentsConfigured,
  feeLabel,
}: {
  doctorId: string
  slots: Slot[]
  caseId?: string
  paymentsConfigured: boolean
  feeLabel: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingNotice, setPendingNotice] = useState(false)

  async function confirm() {
    if (!selected) return
    setError(null)
    setLoading(true)
    const res = await bookConsultation({
      doctorId,
      startsAt: selected,
      caseId,
      type: "VIDEO_CONSULTATION",
    })
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    if (res.data!.paymentConfigured && res.data!.checkoutUrl) {
      // Go to the secure payment page. Confirmation happens via webhook.
      window.location.href = res.data!.checkoutUrl
      return
    }
    // Payments not configured: appointment created as pending — be honest.
    setLoading(false)
    setPendingNotice(true)
  }

  if (pendingNotice) {
    return (
      <Card className="space-y-3 p-6">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              تم إنشاء الموعد مبدئيًا بانتظار الدفع.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              بوابة الدفع غير مفعّلة في هذه البيئة، لذلك لم يتم تأكيد الموعد بعد.
              سيتم التأكيد تلقائيًا بمجرد إتمام الدفع.
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/dashboard/appointments")}>
          عرض مواعيدي
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {!paymentsConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4" />
          بوابة الدفع غير مفعّلة في هذه البيئة. يمكنك اختيار موعد، وسيُنشأ بحالة
          «بانتظار الدفع» دون تأكيد وهمي.
        </div>
      )}

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 font-heading font-semibold text-foreground">
          <CalendarClock className="size-5 text-primary" />
          اختر موعدًا متاحًا
        </h2>
        <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              onClick={() => setSelected(s.startsAt)}
              className={`rounded-lg border px-3 py-2.5 text-right text-sm transition-colors ${
                selected === s.startsAt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          رسوم الاستشارة: <strong className="text-foreground">{feeLabel}</strong>
        </span>
        <Button disabled={!selected || loading} onClick={confirm}>
          {loading
            ? "جارٍ المتابعة…"
            : paymentsConfigured
              ? "المتابعة إلى الدفع"
              : "تأكيد الموعد"}
        </Button>
      </div>
    </div>
  )
}
