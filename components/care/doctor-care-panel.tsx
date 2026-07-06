"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createTreatmentPlan, publishTreatmentPlan } from "@/lib/actions/treatment-plan"
import { createQuote } from "@/lib/actions/quote"
import type { CarePlan, CareQuote } from "@/lib/data/care"

const ITEM_CATEGORIES = [
  ["DOCTOR_FEE", "أتعاب الطبيب"],
  ["CENTER_FEE", "رسوم المركز"],
  ["OPERATING_ROOM", "غرفة العمليات"],
  ["ANESTHESIA", "التخدير"],
  ["LAB_TESTS", "الفحوصات"],
  ["MEDICATIONS", "الأدوية"],
  ["MEDICAL_GARMENT", "المشد الطبي"],
  ["HOSPITAL_STAY", "الإقامة"],
  ["FOLLOW_UP", "المتابعة"],
  ["OTHER", "أخرى"],
] as const

export function DoctorCarePanel({
  caseId,
  caseStatus,
  plan,
  quote,
}: {
  caseId: string
  caseStatus: string
  plan: CarePlan | null
  quote: CareQuote | null
}) {
  if (caseStatus === "CONSULTATION_COMPLETED") {
    return plan && plan.status === "DRAFT" ? (
      <PublishPlan plan={plan} />
    ) : !plan ? (
      <PlanForm caseId={caseId} />
    ) : (
      <p className="text-sm text-muted-foreground">الخطة منشورة. بانتظار إصدار عرض السعر.</p>
    )
  }
  if (caseStatus === "TREATMENT_PLAN_ISSUED") {
    return quote ? (
      <p className="text-sm text-muted-foreground">تم إصدار عرض السعر وبانتظار قبول المريض.</p>
    ) : (
      <QuoteForm caseId={caseId} />
    )
  }
  return (
    <p className="text-sm text-muted-foreground">
      لا يوجد إجراء مطلوب منك في هذه المرحلة.
    </p>
  )
}

function PlanForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = await createTreatmentPlan({
      caseId,
      title: String(fd.get("title") ?? ""),
      medicalAssessment: String(fd.get("medicalAssessment") ?? ""),
      anesthesiaType: String(fd.get("anesthesiaType") ?? ""),
      recoveryPeriod: String(fd.get("recoveryPeriod") ?? ""),
      preProcedureInstructions: String(fd.get("preProcedureInstructions") ?? ""),
      postProcedureInstructions: String(fd.get("postProcedureInstructions") ?? ""),
      mainRisks: String(fd.get("mainRisks") ?? ""),
      validityDays: Number(fd.get("validityDays") ?? 60),
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <FileText className="size-4 text-primary" /> إنشاء خطة علاجية
      </h3>
      <Field name="title" label="عنوان الخطة" required />
      <TextField name="medicalAssessment" label="التقييم الطبي" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="anesthesiaType" label="نوع التخدير" />
        <Field name="recoveryPeriod" label="مدة التعافي" />
      </div>
      <TextField name="mainRisks" label="المخاطر الرئيسية" />
      <TextField name="preProcedureInstructions" label="تعليمات ما قبل الإجراء" />
      <TextField name="postProcedureInstructions" label="تعليمات ما بعد الإجراء" />
      <Field name="validityDays" label="صلاحية الخطة (أيام)" type="number" defaultValue="60" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "حفظ كمسودة"}
      </Button>
    </form>
  )
}

function PublishPlan({ plan }: { plan: CarePlan }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function publish() {
    setBusy(true)
    setError(null)
    const res = await publishTreatmentPlan(plan.id)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        الخطة «{plan.title}» محفوظة كمسودة. انشرها ليطّلع عليها المريض.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} onClick={publish}>
        <Send className="size-4" /> نشر الخطة
      </Button>
    </div>
  )
}

type Row = { category: string; descriptionAr: string; quantity: string; unitPrice: string; taxRate: string }

function QuoteForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([
    { category: "DOCTOR_FEE", descriptionAr: "أتعاب الطبيب", quantity: "1", unitPrice: "", taxRate: "15" },
  ])
  const [depositPercent, setDepositPercent] = useState("25")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = rows.reduce((s, r) => {
    const line = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0)
    return s + line + (line * (Number(r.taxRate) || 0)) / 100
  }, 0)

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await createQuote({
      caseId,
      items: rows.map((r) => ({
        category: r.category,
        descriptionAr: r.descriptionAr,
        quantity: Number(r.quantity) || 1,
        unitPrice: Number(r.unitPrice) || 0,
        taxRate: Number(r.taxRate) || 0,
      })),
      depositPercent: Number(depositPercent) || 25,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="font-heading font-bold text-foreground">إصدار عرض سعر</h3>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
            <select
              value={r.category}
              onChange={(e) => update(i, { category: e.target.value })}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm sm:col-span-3"
            >
              {ITEM_CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <Input className="sm:col-span-4" placeholder="الوصف" value={r.descriptionAr} onChange={(e) => update(i, { descriptionAr: e.target.value })} />
            <Input className="sm:col-span-1" type="number" placeholder="كمية" value={r.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
            <Input className="sm:col-span-2" type="number" placeholder="السعر" value={r.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} />
            <Input className="sm:col-span-1" type="number" placeholder="ضريبة%" value={r.taxRate} onChange={(e) => update(i, { taxRate: e.target.value })} />
            <button type="button" className="sm:col-span-1 text-destructive" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} aria-label="حذف">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { category: "OTHER", descriptionAr: "", quantity: "1", unitPrice: "", taxRate: "15" }])}>
        <Plus className="size-4" /> إضافة بند
      </Button>

      <div className="flex items-center gap-3">
        <Label htmlFor="depositPercent" className="whitespace-nowrap">نسبة العربون %</Label>
        <Input id="depositPercent" type="number" className="w-24" value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} />
        <span className="text-sm text-muted-foreground">الإجمالي التقديري: {total.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })} ر.س</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? "جارٍ الإصدار…" : "إصدار العرض وإرساله للمريض"}
      </Button>
    </form>
  )
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
    </div>
  )
}
function TextField({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={2} />
    </div>
  )
}
