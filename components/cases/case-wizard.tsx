"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { createCase } from "@/lib/actions/cases"

type Proc = { slug: string; nameAr: string }

export function CaseWizard({
  procedures,
  defaultProcedure,
  doctorId,
  doctorName,
}: {
  procedures: Proc[]
  defaultProcedure?: string
  doctorId?: string
  doctorName?: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [procedureSlug, setProcedureSlug] = useState(defaultProcedure ?? "")
  const [goal, setGoal] = useState("")
  const [description, setDescription] = useState("")
  const [ageYears, setAgeYears] = useState("")
  const [concerns, setConcerns] = useState("")
  const [priorSurgeries, setPriorSurgeries] = useState("")
  const [medications, setMedications] = useState("")
  const [allergies, setAllergies] = useState("")
  const [smoker, setSmoker] = useState(false)

  async function submit() {
    setError(null)
    setLoading(true)
    const res = await createCase({
      procedureSlug,
      doctorId,
      goal,
      description,
      ageYears: ageYears ? Number(ageYears) : undefined,
      answers: { concerns, priorSurgeries, medications, allergies, smoker },
    })
    setLoading(false)
    if (!res.ok) return setError(res.error)
    router.push(`/dashboard/cases/${res.data!.caseId}`)
    router.refresh()
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <StepDot n={1} active={step >= 1} label="الأساسيات" />
        <div className="h-px flex-1 bg-border" />
        <StepDot n={2} active={step >= 2} label="التاريخ الطبي" />
      </div>

      {doctorName && (
        <p className="mb-4 rounded-lg bg-secondary/60 p-3 text-sm text-secondary-foreground">
          الطبيب المختار: <strong>{doctorName}</strong>
        </p>
      )}

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="procedure">الإجراء</Label>
            <select
              id="procedure"
              value={procedureSlug}
              onChange={(e) => setProcedureSlug(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="" disabled>
                اختر الإجراء
              </option>
              {procedures.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal">هدفك من الإجراء</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="مثال: تحسين شكل الأنف وتحسين التنفّس"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="desc">وصف حالتك</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="age">العمر</Label>
            <Input
              id="age"
              type="number"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              className="max-w-32"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!procedureSlug}
              onClick={() => setStep(2)}
            >
              التالي
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="concerns">ما الذي يقلقك تحديدًا؟</Label>
            <Textarea
              id="concerns"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prior">عمليات سابقة (إن وجدت)</Label>
            <Textarea
              id="prior"
              value={priorSurgeries}
              onChange={(e) => setPriorSurgeries(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="meds">أدوية تتناولها حاليًا</Label>
              <Input id="meds" value={medications} onChange={(e) => setMedications(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="allergy">حساسية معروفة</Label>
              <Input id="allergy" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={smoker}
              onChange={(e) => setSmoker(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            مدخّن/ة
          </label>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              السابق
            </Button>
            <Button type="button" disabled={loading} onClick={submit}>
              {loading ? "جارٍ الإنشاء…" : "إنشاء الحالة"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function StepDot({ n, active, label }: { n: number; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </span>
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  )
}
