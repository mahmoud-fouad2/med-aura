"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Check } from "lucide-react"
import { updateMyPracticeAction, toggleMyProcedureAction } from "@/lib/actions/doctor"
import type { DoctorProcedureOption } from "@/lib/data/admin-directory"
import { AvatarUploader } from "@/components/dashboard/avatar-uploader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

export type PracticeInitialData = {
  bio: string | null
  qualifications: string[]
  certifications: string[]
  fellowships: string[]
  memberships: string[]
  consultationFee: string | null
  currency: string
  offersVideo: boolean
  offersInPerson: boolean
  timezone: string
  photoUrl: string | null
  published: boolean
  status: string
}

const COPY = {
  ar: {
    statusApproved: "معتمد",
    statusPending: "قيد المراجعة",
    statusSuspended: "موقوف",
    publishedYes: "ظاهر للمرضى",
    publishedNo: "غير ظاهر حاليًا",
    photoTitle: "الصورة الشخصية",
    professionalTitle: "الملف المهني",
    professionalHint: "يظهر في صفحتك العامة — نبذة واضحة تزيد ثقة المريض.",
    bio: "نبذة عنك",
    qualifications: "المؤهلات",
    certifications: "الشهادات",
    fellowships: "الزمالات",
    memberships: "العضويات",
    onePerLine: "سطر واحد لكل عنصر",
    priceTitle: "السعر والتوفر",
    price: "سعر الاستشارة",
    pricePlaceholder: "مثال: 300",
    currency: "العملة",
    timezone: "المنطقة الزمنية",
    timezoneHint: "مثال: Asia/Riyadh",
    typesTitle: "أنواع الاستشارة",
    videoLabel: "استشارة عن بعد",
    videoHint: "عبر الفيديو داخل التطبيق",
    inPersonLabel: "استشارة حضورية",
    inPersonHint: "في العيادة أو المركز",
    servicesTitle: "الإجراءات التي تقدّمها",
    servicesHint: "اختر الإجراءات المتاحة لديك — تظهر في نتائج البحث.",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ بياناتك.",
    atLeastOneType: "اختر نوع استشارة واحدًا على الأقل.",
  },
  en: {
    statusApproved: "Approved",
    statusPending: "Under review",
    statusSuspended: "Suspended",
    publishedYes: "Visible to patients",
    publishedNo: "Currently hidden",
    photoTitle: "Profile photo",
    professionalTitle: "Professional profile",
    professionalHint: "Shown on your public page — a clear bio builds patient trust.",
    bio: "About you",
    qualifications: "Qualifications",
    certifications: "Certifications",
    fellowships: "Fellowships",
    memberships: "Memberships",
    onePerLine: "One item per line",
    priceTitle: "Price & availability",
    price: "Consultation price",
    pricePlaceholder: "e.g. 300",
    currency: "Currency",
    timezone: "Timezone",
    timezoneHint: "e.g. Asia/Riyadh",
    typesTitle: "Consultation types",
    videoLabel: "Video consultation",
    videoHint: "Via in-app video call",
    inPersonLabel: "In-person consultation",
    inPersonHint: "At the clinic or center",
    servicesTitle: "Procedures you offer",
    servicesHint: "Choose the procedures you provide — shown in search results.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Your details were saved.",
    atLeastOneType: "Choose at least one consultation type.",
  },
} as const

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function PracticeSettingsForm({
  initial,
  procedures,
  locale,
}: {
  initial: PracticeInitialData
  procedures: DoctorProcedureOption[]
  locale: Locale
}) {
  const t = COPY[locale]
  const router = useRouter()

  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl)
  const [bio, setBio] = useState(initial.bio ?? "")
  const [qualifications, setQualifications] = useState(initial.qualifications.join("\n"))
  const [certifications, setCertifications] = useState(initial.certifications.join("\n"))
  const [fellowships, setFellowships] = useState(initial.fellowships.join("\n"))
  const [memberships, setMemberships] = useState(initial.memberships.join("\n"))
  const [fee, setFee] = useState(initial.consultationFee ?? "")
  const [currency, setCurrency] = useState(initial.currency)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [offersVideo, setOffersVideo] = useState(initial.offersVideo)
  const [offersInPerson, setOffersInPerson] = useState(initial.offersInPerson)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!offersVideo && !offersInPerson) {
      setError(t.atLeastOneType)
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    const result = await updateMyPracticeAction({
      consultationFee: fee.trim() ? Number(fee) : undefined,
      currency: currency.trim().toUpperCase(),
      offersVideo,
      offersInPerson,
      timezone: timezone.trim(),
      bio: bio.trim(),
      qualifications: lines(qualifications),
      certifications: lines(certifications),
      fellowships: lines(fellowships),
      memberships: lines(memberships),
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
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            initial.status === "approved"
              ? "bg-success/15 text-success-foreground"
              : initial.status === "suspended"
                ? "bg-destructive/10 text-destructive"
                : "bg-warning/15 text-warning-foreground",
          )}
        >
          {initial.status === "approved" ? t.statusApproved : initial.status === "suspended" ? t.statusSuspended : t.statusPending}
        </span>
        <span className="text-sm text-muted-foreground">{initial.published ? t.publishedYes : t.publishedNo}</span>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.photoTitle}</h2>
        <AvatarUploader photoUrl={photoUrl} onChange={setPhotoUrl} locale={locale} />
      </Card>

      <form onSubmit={onSave} className="space-y-6">
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">{t.professionalTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.professionalHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pr-bio">{t.bio}</Label>
            <Textarea id="pr-bio" rows={4} maxLength={2000} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-qual">
                {t.qualifications} <span className="font-normal text-muted-foreground">({t.onePerLine})</span>
              </Label>
              <Textarea id="pr-qual" rows={3} value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-cert">
                {t.certifications} <span className="font-normal text-muted-foreground">({t.onePerLine})</span>
              </Label>
              <Textarea id="pr-cert" rows={3} value={certifications} onChange={(e) => setCertifications(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-fell">
                {t.fellowships} <span className="font-normal text-muted-foreground">({t.onePerLine})</span>
              </Label>
              <Textarea id="pr-fell" rows={3} value={fellowships} onChange={(e) => setFellowships(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-mem">
                {t.memberships} <span className="font-normal text-muted-foreground">({t.onePerLine})</span>
              </Label>
              <Textarea id="pr-mem" rows={3} value={memberships} onChange={(e) => setMemberships(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-heading text-base font-semibold text-foreground">{t.priceTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="pr-fee">{t.price}</Label>
              <Input
                id="pr-fee"
                dir="ltr"
                inputMode="decimal"
                placeholder={t.pricePlaceholder}
                value={fee}
                onChange={(e) => setFee(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pr-currency">{t.currency}</Label>
              <Input
                id="pr-currency"
                dir="ltr"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-3">
              <Label htmlFor="pr-tz">{t.timezone}</Label>
              <Input
                id="pr-tz"
                dir="ltr"
                placeholder={t.timezoneHint}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value.replace(/\s/g, ""))}
              />
            </div>
          </div>

          <div className="h-px bg-border" />

          <h3 className="text-sm font-semibold text-foreground">{t.typesTitle}</h3>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={offersVideo} onCheckedChange={(c) => setOffersVideo(Boolean(c))} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-foreground">{t.videoLabel}</span>
              <span className="block text-xs text-muted-foreground">{t.videoHint}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={offersInPerson} onCheckedChange={(c) => setOffersInPerson(Boolean(c))} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-foreground">{t.inPersonLabel}</span>
              <span className="block text-xs text-muted-foreground">{t.inPersonHint}</span>
            </span>
          </label>
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

      <ProceduresCard procedures={procedures} locale={locale} />
    </div>
  )
}

function ProceduresCard({ procedures, locale }: { procedures: DoctorProcedureOption[]; locale: Locale }) {
  const t = COPY[locale]
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const groups = new Map<string, DoctorProcedureOption[]>()
  for (const p of procedures) {
    const name = locale === "ar" ? p.categoryNameAr : p.categoryNameEn
    const bucket = groups.get(name)
    if (bucket) bucket.push(p)
    else groups.set(name, [p])
  }

  async function toggle(procedureId: string, assign: boolean) {
    setPendingId(procedureId)
    setError(null)
    const result = await toggleMyProcedureAction({ procedureId, assign })
    setPendingId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">{t.servicesTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.servicesHint}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {Array.from(groups.entries()).map(([name, items]) => (
        <div key={name} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{name}</h3>
          <div className="flex flex-wrap gap-2">
            {items.map((p) => {
              const busy = pendingId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle(p.id, !p.assigned)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    p.assigned
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.assigned && <Check className="size-3" />}
                  {locale === "ar" ? p.nameAr : p.nameEn}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </Card>
  )
}
