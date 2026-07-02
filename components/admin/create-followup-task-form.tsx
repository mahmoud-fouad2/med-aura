"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createFollowUpTask } from "@/lib/actions/follow-up"

const TYPES = [
  { value: "PHOTO_UPLOAD", label: "رفع صور" },
  { value: "QUESTIONNAIRE", label: "استبيان" },
  { value: "VIDEO_APPOINTMENT", label: "موعد فيديو" },
  { value: "IN_PERSON_APPOINTMENT", label: "موعد حضوري" },
  { value: "MEDICATION_REMINDER", label: "تذكير بالدواء" },
  { value: "GENERAL_CHECK", label: "متابعة عامة" },
  { value: "DOCTOR_REVIEW", label: "مراجعة الطبيب" },
] as const

/** Staff-scheduled follow-up task, for cases needing a check-in beyond the automatic post-procedure plan. */
export function CreateFollowUpTaskForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>("GENERAL_CHECK")
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [requiredPhotos, setRequiredPhotos] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await createFollowUpTask({
      caseId,
      type,
      title,
      instructions,
      dueAt: dueAt ? new Date(dueAt).toISOString() : "",
      requiredPhotos: type === "PHOTO_UPLOAD" ? requiredPhotos : 0,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setOpen(false)
    setTitle("")
    setInstructions("")
    setDueAt("")
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" /> جدولة مهمة متابعة
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-heading font-bold text-foreground">جدولة مهمة متابعة</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نوع المهمة">
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ الاستحقاق">
          <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
      </div>
      <Field label="العنوان">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: متابعة أسبوعين بعد الإجراء" />
      </Field>
      <Field label="تعليمات (اختياري)">
        <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </Field>
      {type === "PHOTO_UPLOAD" && (
        <Field label="عدد الصور المطلوبة">
          <Input type="number" min={1} max={10} value={requiredPhotos} onChange={(e) => setRequiredPhotos(Number(e.target.value))} />
        </Field>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || title.trim().length < 3 || !dueAt} onClick={onSubmit}>
          {busy ? "جارٍ الجدولة…" : "جدولة المهمة"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
