"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { submitCenterApplication } from "@/lib/actions/provider"

const LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "الإنجليزية" },
  { code: "tr", label: "التركية" },
  { code: "fr", label: "الفرنسية" },
]

const SERVICES_PRESET = [
  "جراحة تجميل الوجه",
  "شفط الدهون ونحت الجسم",
  "زراعة الشعر",
  "تجميل الأنف",
  "إجراءات غير جراحية (بوتوكس، فيلر)",
  "علاجات ليزر",
  "علاجات البشرة الطبية",
  "استشارات فيديو",
]

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string }

export function CenterApplicationForm({
  countries,
}: {
  countries: { code: string; nameAr: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [state, setState] = useState<FormState>({ status: "idle" })
  const [langs, setLangs] = useState<string[]>(["ar"])
  const [services, setServices] = useState<string[]>([])
  const [customService, setCustomService] = useState("")

  function toggleLang(code: string) {
    setLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    )
  }

  function toggleService(s: string) {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function addCustomService() {
    const v = customService.trim()
    if (v && !services.includes(v)) {
      setServices((prev) => [...prev, v])
      setCustomService("")
    }
  }

  async function onSubmit(fd: FormData) {
    setState({ status: "submitting" })
    const input = {
      legalName: String(fd.get("legalName") ?? "").trim(),
      name: String(fd.get("name") ?? "").trim(),
      country: String(fd.get("country") ?? ""),
      city: String(fd.get("city") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      website: String(fd.get("website") ?? "").trim() || undefined,
      representativeName: String(fd.get("representativeName") ?? "").trim(),
      representativeTitle: String(fd.get("representativeTitle") ?? "").trim(),
      languages: langs,
      services,
      license: {
        commercialRegistration: String(fd.get("commercialRegistration") ?? "").trim(),
        facilityLicenseNumber: String(fd.get("facilityLicenseNumber") ?? "").trim(),
        licenseExpiryDate: String(fd.get("licenseExpiryDate") ?? ""),
        issuingAuthority: String(fd.get("issuingAuthority") ?? "").trim(),
      },
      notes: String(fd.get("notes") ?? "").trim(),
      consent: fd.get("consent") === "on",
    }
    start(async () => {
      const res = await submitCenterApplication(input)
      if (res.ok) {
        setState({ status: "success" })
        toast.success("تم استلام طلبك بنجاح.")
        router.refresh()
      } else {
        setState({ status: "error", message: res.error })
        toast.error(res.error)
      }
    })
  }

  if (state.status === "success") {
    return (
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          تم استلام طلبك
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          سيتواصل فريق المراجعة والاعتماد معك خلال أيام العمل التالية لإكمال المراجعة
          وطلب المستندات إن لزم. تابع حالة الطلب من لوحة التحكم.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState({ status: "idle" })}
          >
            إرسال طلب آخر
          </Button>
          <Button size="sm" onClick={() => router.push("/dashboard")}>
            إلى لوحة التحكم
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <Section title="بيانات المركز">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم القانوني" required>
            <Input name="legalName" required minLength={3} maxLength={200} />
          </Field>
          <Field label="الاسم التجاري" required>
            <Input name="name" required minLength={3} maxLength={200} />
          </Field>
          <Field label="الدولة" required>
            <select
              name="country"
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">اختر دولة…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المدينة" required>
            <Input name="city" required minLength={2} maxLength={120} />
          </Field>
          <Field label="العنوان (اختياري)" full>
            <Input name="address" maxLength={500} />
          </Field>
        </div>
      </Section>

      <Section title="بيانات التواصل">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الهاتف" required>
            <Input
              name="phone"
              type="tel"
              required
              minLength={6}
              maxLength={30}
              dir="ltr"
            />
          </Field>
          <Field label="البريد الإلكتروني" required>
            <Input name="email" type="email" required dir="ltr" />
          </Field>
          <Field label="الموقع الإلكتروني (اختياري)" full>
            <Input name="website" type="url" dir="ltr" />
          </Field>
        </div>
      </Section>

      <Section title="المسؤول المفوَّض">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم" required>
            <Input name="representativeName" required minLength={3} />
          </Field>
          <Field label="المسمى" required>
            <Input name="representativeTitle" required minLength={2} />
          </Field>
        </div>
      </Section>

      <Section title="اللغات">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <label
              key={l.code}
              className={
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (langs.includes(l.code)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40")
              }
            >
              <input
                type="checkbox"
                checked={langs.includes(l.code)}
                onChange={() => toggleLang(l.code)}
                className="sr-only"
              />
              {l.label}
            </label>
          ))}
        </div>
        {langs.length === 0 && (
          <p className="text-xs text-destructive">اختر لغة واحدة على الأقل.</p>
        )}
      </Section>

      <Section title="الخدمات التجميلية المقدَّمة">
        <div className="flex flex-wrap gap-2">
          {SERVICES_PRESET.map((s) => (
            <label
              key={s}
              className={
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors " +
                (services.includes(s)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40")
              }
            >
              <input
                type="checkbox"
                checked={services.includes(s)}
                onChange={() => toggleService(s)}
                className="sr-only"
              />
              {s}
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            placeholder="أضف خدمة إضافية…"
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomService}
          >
            إضافة
          </Button>
        </div>
        {services.length === 0 && (
          <p className="text-xs text-destructive">اذكر خدمة واحدة على الأقل.</p>
        )}
      </Section>

      <Section title="التراخيص والسجلات">
        <p className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          تُخزَّن أرقام السجل التجاري وترخيص المنشأة مشفَّرة، ويظهر آخر 4 أرقام
          فقط في لوحة الإدارة. سيطلب فريق المراجعة والاعتماد المستندات الأصلية
          أثناء المراجعة.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم السجل التجاري" required>
            <Input
              name="commercialRegistration"
              required
              minLength={3}
              dir="ltr"
            />
          </Field>
          <Field label="رقم ترخيص المنشأة الطبية" required>
            <Input
              name="facilityLicenseNumber"
              required
              minLength={3}
              dir="ltr"
            />
          </Field>
          <Field label="جهة إصدار ترخيص المنشأة" required>
            <Input name="issuingAuthority" required minLength={2} />
          </Field>
          <Field label="تاريخ انتهاء ترخيص المنشأة" required>
            <Input name="licenseExpiryDate" type="date" required />
          </Field>
        </div>
      </Section>

      <Section title="ملاحظات (اختياري)">
        <Textarea
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="أي معلومات إضافية تفيد فريق المراجعة…"
        />
      </Section>

      <Card className="space-y-3 border-primary/30 bg-primary/5 p-4">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-1 size-4 accent-primary"
          />
          <span>
            أقرّ بصحة البيانات المقدَّمة، وأوافق على قيام فريق Med Aura بمراجعة
            الترخيص وطلب المستندات المطلوبة قبل الاعتماد، بما يتوافق مع سياسة
            الخصوصية.
          </span>
        </label>
      </Card>

      {state.status === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={pending}
          loadingText="جارٍ الإرسال…"
          disabled={langs.length === 0 || services.length === 0}
        >
          إرسال الطلب للمراجعة
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-heading text-base font-bold text-foreground">
        {title}
      </h2>
      {children}
    </Card>
  )
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string
  required?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={"space-y-1 " + (full ? "sm:col-span-2" : "")}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
