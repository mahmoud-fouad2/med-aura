"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cancelAppointment } from "@/lib/actions/appointments"

export function CancelAppointmentButton({
  appointmentId,
  reference,
}: {
  appointmentId: string
  reference: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end">
      <ConfirmDialog
        title="إلغاء الموعد"
        description={`هل أنت متأكد من رغبتك في إلغاء الموعد (${reference})؟ لن تتمكن من الحضور أو الانضمام بعد الإلغاء.`}
        confirmLabel="نعم، إلغاء الموعد"
        cancelLabel="تراجع"
        tone="destructive"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="size-3.5 me-1" />
            إلغاء الموعد
          </Button>
        }
        onConfirm={async () => {
          setError(null)
          const res = await cancelAppointment({ appointmentId })
          if (!res.ok) {
            setError(res.error)
            return false
          }
          router.refresh()
          return true
        }}
      />
      {error && (
        <p className="mt-1 text-[11px] text-destructive text-end">{error}</p>
      )}
    </div>
  )
}
