"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, CalendarCheck, ClipboardCheck, Stethoscope, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  medicalApprove,
  centerConfirmProcedure,
  patientConfirmProcedure,
  completeProcedure,
} from "@/lib/actions/procedure"
import { submitReview } from "@/lib/actions/review"
import type { CareStage } from "@/lib/data/care"

type Role = "doctor" | "center" | "patient"

export function StageActions({
  caseId,
  caseStatus,
  role,
  stage,
}: {
  caseId: string
  caseStatus: string
  role: Role
  stage: CareStage
}) {
  if (role === "doctor" && caseStatus === "DEPOSIT_PAID") return <MedicalApprove caseId={caseId} />
  if (role === "center" && caseStatus === "MEDICALLY_APPROVED") return <CenterConfirm caseId={caseId} />
  if (role === "patient" && caseStatus === "CENTER_CONFIRMED")
    return <Acknowledge caseId={caseId} date={stage.booking?.scheduledDate ?? null} />
  if (role === "center" && caseStatus === "PROCEDURE_CONFIRMED") return <Complete caseId={caseId} />
  if (
    role === "patient" &&
    ["PROCEDURE_COMPLETED", "FOLLOW_UP", "FULLY_PAID", "CLOSED"].includes(caseStatus) &&
    !stage.hasReview
  )
    return <ReviewForm caseId={caseId} />
  return null
}

function useAction() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true)
    setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "حدث خطأ")
    router.refresh()
  }
  return { busy, error, run }
}

function MedicalApprove({ caseId }: { caseId: string }) {
  const { busy, error, run } = useAction()
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        run(() =>
          medicalApprove({
            caseId,
            finalAssessment: String(fd.get("finalAssessment") ?? ""),
            conditions: String(fd.get("conditions") ?? ""),
          }),
        )
      }}
    >
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <ShieldCheck className="size-4 text-primary" /> الاعتماد الطبي
      </h3>
      <p className="text-sm text-muted-foreground">
        بعد استكمال المتطلبات، اعتمد الحالة طبيًا للمتابعة لتأكيد المركز.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="finalAssessment">التقييم النهائي</Label>
        <Textarea id="finalAssessment" name="finalAssessment" rows={2} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="conditions">شروط/ملاحظات (اختياري)</Label>
        <Textarea id="conditions" name="conditions" rows={2} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ…" : "اعتماد طبي"}</Button>
    </form>
  )
}

function CenterConfirm({ caseId }: { caseId: string }) {
  const { busy, error, run } = useAction()
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        run(() =>
          centerConfirmProcedure({
            caseId,
            scheduledDate: String(fd.get("scheduledDate") ?? ""),
            operatingRoom: String(fd.get("operatingRoom") ?? ""),
            notes: String(fd.get("notes") ?? ""),
          }),
        )
      }}
    >
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <CalendarCheck className="size-4 text-primary" /> اعتماد المركز وتحديد الموعد
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduledDate">تاريخ الإجراء</Label>
          <Input id="scheduledDate" name="scheduledDate" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="operatingRoom">غرفة العمليات (اختياري)</Label>
          <Input id="operatingRoom" name="operatingRoom" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ…" : "تأكيد المركز للتاريخ"}</Button>
    </form>
  )
}

function Acknowledge({ caseId, date }: { caseId: string; date: string | null }) {
  const { busy, error, run } = useAction()
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <ClipboardCheck className="size-4 text-primary" /> تأكيد الإجراء
      </h3>
      {date && (
        <p className="text-sm text-foreground">
          الموعد المقترح من المركز: <strong>{date}</strong>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        بالضغط على «أقر وأكّد» فإنك تؤكد اطّلاعك على تعليمات ما قبل الإجراء
        والتزامك بها.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} onClick={() => run(() => patientConfirmProcedure(caseId))}>
        {busy ? "جارٍ…" : "أقر بالتعليمات وأكّد الإجراء"}
      </Button>
    </div>
  )
}

function Complete({ caseId }: { caseId: string }) {
  const { busy, error, run } = useAction()
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        run(() =>
          completeProcedure({
            caseId,
            notes: String(fd.get("notes") ?? ""),
            anesthesiaType: String(fd.get("anesthesiaType") ?? ""),
          }),
        )
      }}
    >
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <Stethoscope className="size-4 text-primary" /> تسجيل تنفيذ الإجراء
      </h3>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ…" : "إكمال الإجراء وبدء المتابعة"}</Button>
    </form>
  )
}

function ReviewForm({ caseId }: { caseId: string }) {
  const { busy, error, run } = useAction()
  const [overall, setOverall] = useState(5)
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        run(() =>
          submitReview({
            caseId,
            overallRating: overall,
            comment: String(fd.get("comment") ?? ""),
          }),
        )
      }}
    >
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <Star className="size-4 text-primary" /> قيّم تجربتك
      </h3>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}`}
            onClick={() => setOverall(n)}
            className="p-1"
          >
            <Star className={`size-7 ${n <= overall ? "fill-current text-gold" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="comment">رأيك (اختياري)</Label>
        <Textarea id="comment" name="comment" rows={3} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "جارٍ…" : "نشر التقييم الموثّق"}</Button>
    </form>
  )
}
