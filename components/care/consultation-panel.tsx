"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { completeConsultation, recordConsultationOutcome } from "@/lib/actions/care"

type Props = {
  caseId: string
  caseStatus: string
  consultation: { id: string; status: string } | null
  hasOutcome: boolean
}

const SUITABILITY_OPTIONS = [
  { value: "SUITABLE_PRELIMINARILY", label: "مرشّح مبدئيًا" },
  { value: "MORE_INFORMATION_REQUIRED", label: "بحاجة لمعلومات إضافية" },
  { value: "IN_PERSON_ASSESSMENT_REQUIRED", label: "يتطلب تقييمًا حضوريًا" },
  { value: "NOT_SUITABLE", label: "غير مناسب حاليًا" },
  { value: "REFERRED_ELSEWHERE", label: "إحالة لجهة أنسب" },
]

export function ConsultationPanel({ caseId, caseStatus, consultation, hasOutcome }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onComplete() {
    if (!consultation) return
    setBusy(true)
    setError(null)
    const res = await completeConsultation(consultation.id)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  const canComplete = consultation?.status === "CONFIRMED"
  const canRecord = caseStatus === "CONSULTATION_COMPLETED"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Stethoscope className="size-4 text-primary" />
        لوحة الطبيب لهذه الحالة
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {canComplete && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="mb-3 text-sm text-foreground">
            بعد انتهاء جلسة الاستشارة، أكّد إكمالها لتتمكن من تسجيل النتيجة الطبية.
          </p>
          <Button disabled={busy} onClick={onComplete}>
            <CheckCircle2 className="size-4" />
            إكمال الاستشارة
          </Button>
        </div>
      )}

      {canRecord && (
        <OutcomeForm caseId={caseId} hasOutcome={hasOutcome} />
      )}

      {!canComplete && !canRecord && (
        <p className="text-sm text-muted-foreground">
          ستظهر إجراءات الطبيب هنا بعد تأكيد حجز الاستشارة وإتمامها.
        </p>
      )}
    </div>
  )
}

function OutcomeForm({ caseId, hasOutcome }: { caseId: string; hasOutcome: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [status, setStatus] = useState("SUITABLE_PRELIMINARILY")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = await recordConsultationOutcome({
      caseId,
      suitabilityStatus: status,
      patientVisibleNotes: String(fd.get("patientVisibleNotes") ?? ""),
      clinicalSummary: String(fd.get("clinicalSummary") ?? ""),
      internalNotes: String(fd.get("internalNotes") ?? ""),
      additionalInformationRequired: String(fd.get("additionalInformationRequired") ?? ""),
      notSuitableReason: String(fd.get("notSuitableReason") ?? ""),
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setDone(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-heading font-bold text-foreground">
        {hasOutcome ? "تحديث نتيجة الاستشارة" : "تسجيل نتيجة الاستشارة"}
      </h3>

      <div className="flex flex-col gap-2">
        <Label htmlFor="suitabilityStatus">الملاءمة المبدئية</Label>
        <select
          id="suitabilityStatus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {SUITABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="patientVisibleNotes">ملاحظات تظهر للمريض</Label>
        <Textarea id="patientVisibleNotes" name="patientVisibleNotes" rows={3} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="clinicalSummary">الملخص السريري</Label>
        <Textarea id="clinicalSummary" name="clinicalSummary" rows={2} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="internalNotes">ملاحظات داخلية (لا تظهر للمريض)</Label>
        <Textarea id="internalNotes" name="internalNotes" rows={2} />
      </div>

      {status === "MORE_INFORMATION_REQUIRED" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="additionalInformationRequired">المعلومات/المستندات المطلوبة</Label>
          <Textarea id="additionalInformationRequired" name="additionalInformationRequired" rows={2} />
        </div>
      )}

      {(status === "NOT_SUITABLE" || status === "REFERRED_ELSEWHERE") && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="notSuitableReason">السبب (داخلي)</Label>
          <Textarea id="notSuitableReason" name="notSuitableReason" rows={2} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm text-success">تم حفظ نتيجة الاستشارة.</p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "حفظ النتيجة"}
      </Button>
    </form>
  )
}
