"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { createCase, grantCaseConsent } from "@/lib/actions/cases"

type Proc = { slug: string; nameAr: string }
export type WizardDoctor = {
  id: string
  name: string
  city: string | null
  procedureSlugs: string[]
}

export function CaseWizard({
  procedures,
  doctors = [],
  defaultProcedure,
  doctorId,
  doctorName,
}: {
  procedures: Proc[]
  /** Selectable doctors when none was preselected from a profile page. */
  doctors?: WizardDoctor[]
  defaultProcedure?: string
  doctorId?: string
  doctorName?: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [procedureSlug, setProcedureSlug] = useState(defaultProcedure ?? "")
  const [pickedDoctorId, setPickedDoctorId] = useState("")
  const [goal, setGoal] = useState("")
  const [description, setDescription] = useState("")
  const [ageYears, setAgeYears] = useState("")
  const [concerns, setConcerns] = useState("")
  const [priorSurgeries, setPriorSurgeries] = useState("")
  const [medications, setMedications] = useState("")
  const [allergies, setAllergies] = useState("")
  const [smoker, setSmoker] = useState(false)
  const [grantAccess, setGrantAccess] = useState(true)

  const fixedDoctor = Boolean(doctorId)
  const effectiveDoctorId = doctorId ?? pickedDoctorId

  // Doctors who actually offer the chosen procedure; falls back to the full
  // list before a procedure is chosen so the select is never mysteriously empty.
  const matchingDoctors = useMemo(() => {
    if (!procedureSlug) return doctors
    const match = doctors.filter((d) => d.procedureSlugs.includes(procedureSlug))
    return match.length > 0 ? match : doctors
  }, [doctors, procedureSlug])

  const pickedDoctor = doctors.find((d) => d.id === pickedDoctorId)

  async function submit() {
    setError(null)
    setLoading(true)
    const res = await createCase({
      procedureSlug,
      doctorId: effectiveDoctorId,
      goal,
      description,
      ageYears: ageYears ? Number(ageYears) : undefined,
      answers: { concerns, priorSurgeries, medications, allergies, smoker },
    })
    if (!res.ok) {
      setLoading(false)
      return setError(res.error)
    }
    const caseId = res.data!.caseId

    // Auto-grant viewing access so the case actually reaches the doctor's
    // desk ready to review — the single biggest drop-off in the old flow.
    if (grantAccess) {
      const consentRes = await grantCaseConsent(caseId)
      if (!consentRes.ok) {
        // Case exists; consent can be granted later from the case page.
        toast.warning(
          "أُنشئت الحالة، لكن تعذّر منح إذن الاطلاع تلقائيًا — يمكنك منحه من صفحة الحالة.",
        )
      }
    }

    setLoading(false)
    toast.success("أُرسلت حالتك إلى الطبيب بنجاح.")
    router.push(`/dashboard/cases/${caseId}`)
    router.refresh()
  }

  const canContinue = Boolean(procedureSlug && effectiveDoctorId)

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <StepDot n={1} active={step >= 1} label="الأساسيات" />
        <div className="h-px flex-1 bg-border" />
        <StepDot n={2} active={step >= 2} label="التاريخ الصحي" />
      </div>

      {fixedDoctor && doctorName && (
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

          {!fixedDoctor && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor">الطبيب المعالج</Label>
              <select
                id="doctor"
                value={pickedDoctorId}
                onChange={(e) => setPickedDoctorId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="" disabled>
                  {procedureSlug
                    ? "اختر الطبيب الذي تريد إرسال حالتك إليه"
                    : "اختر الإجراء أولًا لعرض الأطباء المناسبين"}
                </option>
                {matchingDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.city ? ` — ${d.city}` : ""}
                  </option>
                ))}
              </select>
              {pickedDoctor && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Stethoscope className="size-3.5 text-primary" />
                  ستصل حالتك مباشرة إلى {pickedDoctor.name} لمراجعتها.
                </p>
              )}
              {doctors.length === 0 && (
                <p className="text-xs text-warning-foreground">
                  لا يوجد أطباء متاحون حاليًا لهذا الإجراء — جرّب لاحقًا أو
                  تصفّح صفحة الأطباء.
                </p>
              )}
            </div>
          )}

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
            <Button type="button" disabled={!canContinue} onClick={() => setStep(2)}>
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

          <label className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
            <input
              type="checkbox"
              checked={grantAccess}
              onChange={(e) => setGrantAccess(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                امنح الطبيب إذن الاطلاع فورًا
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                يتيح للطبيب مراجعة حالتك وصورك مباشرة. يمكنك سحب الإذن في أي
                وقت من صفحة الحالة.
              </span>
            </span>
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
            <Button
              type="button"
              loading={loading}
              loadingText="جارٍ الإرسال…"
              onClick={submit}
            >
              إرسال الحالة للطبيب
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
