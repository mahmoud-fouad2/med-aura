"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
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

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <ShieldPlus className="size-4" /> إنشاء تنبيه سلامة
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء تنبيه سلامة</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="مستوى الخطورة">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="الوصف">
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="وصف الحالة أو سبب التنبيه" />
          </Field>
          {assignees.length > 0 && (
            <Field label="تعيين مسؤول (اختياري)">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">بدون تعيين</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button size="sm" variant="ghost" disabled={busy} />}>إلغاء</DialogClose>
          <Button size="sm" disabled={busy || summary.trim().length < 3} onClick={onSubmit}>
            {busy ? "جارٍ الإنشاء…" : "إنشاء التنبيه"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
