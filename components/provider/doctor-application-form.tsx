"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { submitDoctorApplication } from "@/lib/actions/provider"

const LANGUAGES = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "الإنجليزية" },
  { code: "tr", label: "التركية" },
  { code: "fr", label: "الفرنسية" },
]

export function DoctorApplicationForm({
  procedures,
  countries,
}: {
  procedures: { slug: string; nameAr: string }[]
  countries: { code: string; nameAr: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [langs, setLangs] = useState<string[]>(["ar"])
  const [procs, setProcs] = useState<string[]>([])

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    value: string,
  ) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const input = {
      name: String(fd.get("name") ?? ""),
      title: String(fd.get("title") ?? ""),
      bio: String(fd.get("bio") ?? ""),
      country: String(fd.get("country") ?? ""),
      city: String(fd.get("city") ?? ""),
      yearsExperience: Number(fd.get("yearsExperience") ?? 0),
      consultationFee: fd.get("consultationFee")
        ? Number(fd.get("consultationFee"))
        : undefined,
      languages: langs,
      procedures: procs,
      license: {
        number: String(fd.get("licenseNumber") ?? ""),
        issuingAuthority: String(fd.get("licenseAuthority") ?? ""),
        expiryDate: String(fd.get("licenseExpiry") ?? ""),
      },
    }
    const res = await submitDoctorApplication(input)
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="الاسم الكامل" name="name" required />
        <Field label="المسمى المهني" name="title" placeholder="مثال: استشاري جراحة تجميل" required />

        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">نبذة مهنية</Label>
          <Textarea id="bio" name="bio" rows={3} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">الدولة</Label>
            <select
              id="country"
              name="country"
              required
              defaultValue=""
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="" disabled>
                اختر الدولة
              </option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>
          <Field label="المدينة" name="city" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="سنوات الخبرة" name="yearsExperience" type="number" required />
          <Field label="سعر الاستشارة (ر.س)" name="consultationFee" type="number" />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">اللغات</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Chip
                key={l.code}
                active={langs.includes(l.code)}
                onClick={() => toggle(langs, setLangs, l.code)}
                label={l.label}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">الإجراءات التي تقدّمها</legend>
          <div className="flex flex-wrap gap-2">
            {procedures.map((p) => (
              <Chip
                key={p.slug}
                active={procs.includes(p.slug)}
                onClick={() => toggle(procs, setProcs, p.slug)}
                label={p.nameAr}
              />
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <h3 className="mb-3 font-heading font-semibold text-foreground">
            بيانات الترخيص
          </h3>
          <div className="flex flex-col gap-4">
            <Field label="رقم الترخيص" name="licenseNumber" required />
            <Field label="جهة الإصدار" name="licenseAuthority" required />
            <Field label="تاريخ انتهاء الترخيص" name="licenseExpiry" type="date" required />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ الإرسال…" : "إرسال الطلب للمراجعة"}
        </Button>
      </form>
    </Card>
  )
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  )
}
