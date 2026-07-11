"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  CheckCircle2,
  Upload,
  Loader2,
  FileText,
  Eye,
  AlertTriangle,
  RotateCcw,
  Siren,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { submitFollowUpTask, reviewFollowUpTask } from "@/lib/actions/follow-up"
import { MAX_FILE_BYTES, isAllowedMime } from "@/lib/uploads"
import { followUpTaskStatusAr } from "@/lib/status-labels"
import type { FollowUpTaskView } from "@/lib/data/care"

const TYPE_LABELS: Record<string, string> = {
  PHOTO_UPLOAD: "رفع صور",
  QUESTIONNAIRE: "استبيان",
  VIDEO_APPOINTMENT: "موعد فيديو",
  IN_PERSON_APPOINTMENT: "موعد حضوري",
  MEDICATION_REMINDER: "تذكير بالدواء",
  GENERAL_CHECK: "متابعة عامة",
  DOCTOR_REVIEW: "مراجعة الطبيب",
}
const STATUS_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  SCHEDULED: "outline",
  DUE: "secondary",
  MISSED: "destructive",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "secondary",
  COMPLETED: "default",
  ESCALATED: "destructive",
  CANCELLED: "outline",
}

export function FollowUpPanel({
  caseId,
  tasks,
  canSubmit,
  canReview,
}: {
  caseId: string
  tasks: FollowUpTaskView[]
  /** true for the patient who owns the case */
  canSubmit: boolean
  /** true for the case's doctor (FOLLOWUP_MANAGE) */
  canReview: boolean
}) {
  if (tasks.length === 0) return null
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold text-foreground">خطة المتابعة</h2>
      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard key={t.id} caseId={caseId} task={t} canSubmit={canSubmit} canReview={canReview} />
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  caseId,
  task,
  canSubmit,
  canReview,
}: {
  caseId: string
  task: FollowUpTaskView
  canSubmit: boolean
  canReview: boolean
}) {
  const statusVariant = STATUS_VARIANT[task.status] ?? "outline"
  const showSubmitForm = canSubmit && ["SCHEDULED", "DUE", "MISSED"].includes(task.status)
  const showReview = canReview && ["SUBMITTED", "UNDER_REVIEW"].includes(task.status)

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <span className="font-medium text-foreground">{task.title}</span>
          <Badge variant="outline">{TYPE_LABELS[task.type] ?? task.type}</Badge>
        </div>
        <Badge variant={statusVariant}>{followUpTaskStatusAr(task.status)}</Badge>
      </div>
      {task.instructions && (
        <p className="mt-2 text-sm text-muted-foreground">{task.instructions}</p>
      )}
      {task.dueAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          الموعد المستحق: {new Date(task.dueAt).toLocaleDateString("ar-SA-u-nu-latn")}
        </p>
      )}

      {task.latestEntry && (
        <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
          {task.latestEntry.painScore != null && (
            <p>
              <span className="font-medium text-foreground">درجة الألم: </span>
              {task.latestEntry.painScore}/10
            </p>
          )}
          {task.latestEntry.notes && <p className="text-muted-foreground">{task.latestEntry.notes}</p>}
          {task.latestEntry.documentIds.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {task.latestEntry.documentIds.map((id) => (
                <li key={id}>
                  <a
                    href={`/api/documents/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-primary hover:underline"
                  >
                    <Eye className="size-3" /> صورة
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {task.reviewNotes && task.status === "COMPLETED" && (
        <p className="mt-2 rounded-lg bg-success/10 p-3 text-sm text-success">{task.reviewNotes}</p>
      )}

      {showSubmitForm && <SubmitForm caseId={caseId} task={task} />}
      {showReview && <ReviewForm task={task} />}
    </div>
  )
}

function SubmitForm({ caseId, task }: { caseId: string; task: FollowUpTaskView }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [painScore, setPainScore] = useState(0)
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!isAllowedMime(file.type) || file.size > MAX_FILE_BYTES) {
          setError("صورة/PDF فقط، حتى 15 ميجابايت.")
          continue
        }
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            kind: "CASE_PHOTO",
          }),
        })
        if (!presignRes.ok) {
          const body = await presignRes.json().catch(() => ({}))
          setError(body.error ?? "تعذّر بدء الرفع.")
          continue
        }
        const { documentId, uploadUrl } = await presignRes.json()
        const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
        if (!put.ok) {
          setError("فشل رفع الملف.")
          continue
        }
        const fin = await fetch("/api/uploads/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        })
        if (!fin.ok) {
          setError("تعذّر إنهاء الرفع.")
          continue
        }
        setDocumentIds((ids) => [...ids, documentId])
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await submitFollowUpTask({
      taskId: task.id,
      painScore,
      notes,
      documentIds,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        إرسال بيانات المتابعة
      </Button>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      {task.requiredPhotos > 0 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "جارٍ الرفع…" : `رفع صور (مطلوب ${task.requiredPhotos} على الأقل)`}
          </Button>
          {documentIds.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">تم رفع {documentIds.length} صورة.</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`pain-${task.id}`}>درجة الألم (0 بدون ألم — 10 شديد جدًا)</Label>
        <input
          id={`pain-${task.id}`}
          type="range"
          min={0}
          max={10}
          value={painScore}
          onChange={(e) => setPainScore(Number(e.target.value))}
        />
        <span className="text-sm text-muted-foreground">{painScore}/10</span>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${task.id}`}>ملاحظات (اختياري)</Label>
        <Textarea id={`notes-${task.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || uploading} onClick={onSubmit}>
          <CheckCircle2 className="size-4" /> {busy ? "جارٍ الإرسال…" : "إرسال"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </div>
  )
}

function ReviewForm({ task }: { task: FollowUpTaskView }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: "complete" | "resubmit" | "escalate") {
    setBusy(true)
    setError(null)
    const res = await reviewFollowUpTask({ taskId: task.id, decision, reviewNotes: notes })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`review-${task.id}`}>ملاحظات المراجعة (اختياري)</Label>
        <Textarea id={`review-${task.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide("complete")}>
          <CheckCircle2 className="size-4" /> اعتماد واكتمال
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("resubmit")}>
          <RotateCcw className="size-4" /> طلب إعادة الإرسال
        </Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide("escalate")}>
          <Siren className="size-4" /> تصعيد عاجل
        </Button>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        التصعيد ينشئ تنبيه سلامة ويُخطر فريق الرعاية فورًا.
      </p>
    </div>
  )
}
