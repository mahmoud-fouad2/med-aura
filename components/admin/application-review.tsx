"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  approveApplication,
  rejectApplication,
  requestChangesApplication,
} from "@/lib/actions/provider"

type Mode = "idle" | "reject" | "request-changes"

export function ApplicationReview({
  applicationId,
  isDoctor = true,
}: {
  applicationId: string
  isDoctor?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>("idle")
  const [note, setNote] = useState("")
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
    const res = await rejectApplication(applicationId, note)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setMode("idle")
    setNote("")
    router.refresh()
  }

  async function requestChanges() {
    setBusy(true)
    setError(null)
    const res = await requestChangesApplication(applicationId, note)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setMode("idle")
    setNote("")
    router.refresh()
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {error && (
        <p className="mb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {mode === "reject" || mode === "request-changes" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder={
              mode === "reject"
                ? "سبب الرفض (يظهر لمقدّم الطلب)"
                : "التعديلات المطلوبة (تظهر لمقدّم الطلب ليعدّل ويعيد الإرسال)"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              variant={mode === "reject" ? "destructive" : "default"}
              size="sm"
              disabled={busy}
              onClick={mode === "reject" ? reject : requestChanges}
            >
              {mode === "reject" ? "تأكيد الرفض" : "إرسال طلب التعديل"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setMode("idle")}
            >
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={approve}>
            {busy ? "جارٍ المعالجة…" : isDoctor ? "اعتماد ونشر الطبيب" : "اعتماد ونشر المركز"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setMode("request-changes")}
          >
            طلب تعديل
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setMode("reject")}
          >
            رفض
          </Button>
        </div>
      )}
    </div>
  )
}
