"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createSafetyAlertManual } from "@/lib/actions/safety"

const SEVERITIES = [
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "مرتفعة" },
  { value: "CRITICAL", label: "حرجة" },
] as const

/** Staff-initiated safety alert — for cases where the concern didn't come from a patient symptom report. */
export function CreateSafetyAlertForm({
  caseId,
  assignees,
}: {
  caseId: string
  assignees: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [severity, setSeverity] = useState<string>("MEDIUM")
  const [summary, setSummary] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await createSafetyAlertManual({
      caseId,
      severity,
      summary,
      assignedTo: assignedTo || undefined,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setOpen(false)
    setSummary("")
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldPlus className="size-4" /> إنشاء تنبيه سلامة
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-heading font-bold text-foreground">إنشاء تنبيه سلامة</h3>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="alert-severity">مستوى الخطورة</label>
        <select
          id="alert-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="alert-summary">الوصف</label>
        <Textarea id="alert-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="وصف الحالة أو سبب التنبيه" />
      </div>
      {assignees.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="alert-assignee">تعيين مسؤول (اختياري)</label>
          <select
            id="alert-assignee"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">بدون تعيين</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || summary.trim().length < 3} onClick={onSubmit}>
          {busy ? "جارٍ الإنشاء…" : "إنشاء التنبيه"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </div>
  )
}
