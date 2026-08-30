"use client"

import { useState } from "react"
import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { bookConsultation } from "@/lib/actions/booking"
import type { Slot } from "@/lib/data/availability"

export function BookingClient({
  doctorId,
  slots,
  caseId,
  feeLabel,
}: {
  doctorId: string
  slots: Slot[]
  caseId?: string
  feeLabel: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    // Payments are always required to confirm — bookConsultation() only ever
    // succeeds with a checkout URL to send the patient to.
    window.location.href = res.data!.checkoutUrl!
  }

  return (
    <div className="space-y-4">
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
          {loading ? "جارٍ المتابعة…" : "المتابعة إلى الدفع"}
        </Button>
      </div>
    </div>
  )
}
