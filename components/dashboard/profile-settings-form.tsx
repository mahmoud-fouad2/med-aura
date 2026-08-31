"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Ruler, Weight } from "lucide-react"
import { updateOwnProfile } from "@/lib/actions/patient-profile"
import { COUNTRY_CODES, countryNameAr, countryNameEn } from "@/lib/status-labels"
import { AvatarUploader } from "@/components/dashboard/avatar-uploader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

export type OwnProfileData = {
  photoUrl: string | null
  phone: string | null
  residenceCountry: string | null
  city: string | null
  dateOfBirth: string | null
  nationality: string | null
  biologicalSex: "male" | "female" | null
  heightCm: number | null
  weightKg: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
}

const COPY = {
  ar: {
    photoTitle: "الصورة الشخصية",
    contactTitle: "معلومات التواصل",
    phone: "رقم الجوال",
    residenceCountry: "دولة الإقامة",
    city: "المدينة",
    selectCountry: "اختر الدولة",
    aboutTitle: "معلومات إضافية",
    aboutHint: "اختيارية — تساعد طبيبك على تقييم حالتك بدقة أكبر",
    dateOfBirth: "تاريخ الميلاد",
    nationality: "الجنسية",
    sex: "الجنس",
    male: "ذكر",
    female: "أنثى",
    height: "الطول (سم)",
    weight: "الوزن (كجم)",
    emergencyTitle: "جهة اتصال للطوارئ",
    emergencyName: "الاسم",
    emergencyPhone: "رقم الهاتف",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ بياناتك.",
  },
  en: {
    photoTitle: "Profile photo",
    contactTitle: "Contact info",
    phone: "Phone number",
    residenceCountry: "Country of residence",
    city: "City",
    selectCountry: "Select country",
    aboutTitle: "Additional info",
    aboutHint: "Optional — helps your doctor assess your case more accurately",
    dateOfBirth: "Date of birth",
    nationality: "Nationality",
    sex: "Sex",
    male: "Male",
    female: "Female",
    height: "Height (cm)",
    weight: "Weight (kg)",
    emergencyTitle: "Emergency contact",
    emergencyName: "Name",
    emergencyPhone: "Phone number",
    save: "Save changes",
    saving: "Saving…",
    saved: "Your details were saved.",
  },
} as const

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function ProfileSettingsForm({ initial, locale }: { initial: OwnProfileData; locale: Locale }) {
  const t = COPY[locale]
  const router = useRouter()
  const countryName = locale === "ar" ? countryNameAr : countryNameEn

  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl)
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [country, setCountry] = useState(initial.residenceCountry ?? "")
  const [city, setCity] = useState(initial.city ?? "")
  const [dob, setDob] = useState(initial.dateOfBirth ?? "")
  const [nationality, setNationality] = useState(initial.nationality ?? "")
  const [sex, setSex] = useState<"male" | "female" | null>(initial.biologicalSex)
  const [height, setHeight] = useState(initial.heightCm != null ? String(initial.heightCm) : "")
  const [weight, setWeight] = useState(initial.weightKg ?? "")
  const [emergencyName, setEmergencyName] = useState(initial.emergencyContactName ?? "")
  const [emergencyPhone, setEmergencyPhone] = useState(initial.emergencyContactPhone ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    const h = Number(height)
    const w = Number(weight)
    const result = await updateOwnProfile({
      phone,
      residenceCountry: country,
      city: city || undefined,
      dateOfBirth: dob || undefined,
      nationality: nationality || undefined,
      biologicalSex: sex ?? undefined,
      heightCm: height.trim() && Number.isFinite(h) ? h : undefined,
      weightKg: weight.trim() && Number.isFinite(w) ? w : undefined,
      emergencyContactName: emergencyName || undefined,
      emergencyContactPhone: emergencyPhone || undefined,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.photoTitle}</h2>
        <AvatarUploader photoUrl={photoUrl} onChange={setPhotoUrl} locale={locale} />
      </Card>

      <form onSubmit={onSave} className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.contactTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-phone">{t.phone}</Label>
            <Input
              id="ps-phone"
              dir="ltr"
              className="text-right"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              minLength={8}
              autoComplete="tel"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-country">{t.residenceCountry}</Label>
            <select
              id="ps-country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                {t.selectCountry}
              </option>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ps-city">{t.city}</Label>
            <Input id="ps-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">{t.aboutTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.aboutHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-dob">{t.dateOfBirth}</Label>
            <Input
              id="ps-dob"
              type="date"
              dir="ltr"
              max={new Date().toISOString().slice(0, 10)}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-nationality">{t.nationality}</Label>
            <select
              id="ps-nationality"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className={selectClass}
            >
              <option value="">—</option>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t.sex}</Label>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSex(sex === option ? null : option)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    sex === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option === "male" ? t.male : t.female}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-height">
                <span className="inline-flex items-center gap-1.5">
                  <Ruler className="size-3.5" /> {t.height}
                </span>
              </Label>
              <Input
                id="ps-height"
                type="number"
                dir="ltr"
                min={30}
                max={280}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ps-weight">
                <span className="inline-flex items-center gap-1.5">
                  <Weight className="size-3.5" /> {t.weight}
                </span>
              </Label>
              <Input
                id="ps-weight"
                type="number"
                step="0.1"
                dir="ltr"
                min={1}
                max={500}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.emergencyTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-em-name">{t.emergencyName}</Label>
            <Input id="ps-em-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ps-em-phone">{t.emergencyPhone}</Label>
            <Input
              id="ps-em-phone"
              dir="ltr"
              className="text-right"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {busy ? t.saving : t.save}
        </Button>
        {saved && !busy && <span className="text-sm text-muted-foreground">{t.saved}</span>}
      </div>
      </form>
    </div>
  )
}
