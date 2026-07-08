"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { approveApplication, rejectApplication } from "@/lib/actions/provider"

export function ApplicationReview({
  applicationId,
  isDoctor = true,
}: {
  applicationId: string
  isDoctor?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    const res = await approveApplication(applicationId)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  async function reject() {
    setBusy(true)
    setError(null)
    const res = await rejectApplication(applicationId, reason)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setRejecting(false)
    setReason("")
    router.refresh()
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {error && (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {rejecting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="سبب الرفض (يظهر لمقدّم الطلب)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" disabled={busy} onClick={reject}>
              تأكيد الرفض
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setRejecting(false)}
            >
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={approve}>
            {busy ? "جارٍ المعالجة…" : isDoctor ? "اعتماد ونشر الطبيب" : "اعتماد ونشر المركز"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            رفض
          </Button>
        </div>
      )}
    </div>
  )
}
