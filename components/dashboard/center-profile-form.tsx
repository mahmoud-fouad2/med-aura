"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { updateMyCenterAction } from "@/lib/actions/center"
import { CenterMediaUploader } from "@/components/dashboard/center-media-uploader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

const COPY = {
  ar: {
    statusApproved: "معتمد",
    statusPending: "قيد المراجعة",
    statusSuspended: "موقوف",
    publishedYes: "ظاهر للمرضى",
    publishedNo: "غير ظاهر حاليًا",
    mediaTitle: "الشعار وصورة الغلاف",
    aboutTitle: "عرّفنا أكثر عن مركزك",
    aboutHint: "يظهر في صفحة مركزك العامة — وصف واضح يبني ثقة المريض.",
    description: "نبذة عن المركز",
    city: "المدينة",
    address: "العنوان",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني",
    website: "الموقع الإلكتروني",
    languages: "اللغات",
    languagesHint: "افصل بينها بفاصلة، مثال: العربية, English",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ بيانات مركزك.",
  },
  en: {
    statusApproved: "Approved",
    statusPending: "Under review",
    statusSuspended: "Suspended",
    publishedYes: "Visible to patients",
    publishedNo: "Currently hidden",
    mediaTitle: "Logo & cover photo",
    aboutTitle: "Tell us more about your center",
    aboutHint: "Shown on your public center page — a clear description builds patient trust.",
    description: "About the center",
    city: "City",
    address: "Address",
    phone: "Phone number",
    email: "Email",
    website: "Website",
    languages: "Languages",
    languagesHint: "Comma-separated, e.g. العربية, English",
    save: "Save changes",
    saving: "Saving…",
    saved: "Your center's details were saved.",
  },
} as const

export type CenterProfileInitial = {
  description: string | null
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  languages: string[]
  logoUrl: string | null
  coverUrl: string | null
  published: boolean
  status: string
}

export function CenterProfileForm({ initial, locale }: { initial: CenterProfileInitial; locale: Locale }) {
  const t = COPY[locale]
  const router = useRouter()

  const [logoUrl, setLogoUrl] = useState(initial.logoUrl)
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl)
  const [description, setDescription] = useState(initial.description ?? "")
  const [city, setCity] = useState(initial.city ?? "")
  const [address, setAddress] = useState(initial.address ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [email, setEmail] = useState(initial.email ?? "")
  const [website, setWebsite] = useState(initial.website ?? "")
  const [languagesInput, setLanguagesInput] = useState(initial.languages.join(", "))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    const result = await updateMyCenterAction({
      description: description.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      languages: languagesInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
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
        <h2 className="font-heading text-base font-semibold text-foreground">{t.mediaTitle}</h2>
        <div className="flex flex-wrap gap-6">
          <CenterMediaUploader field="logo" photoUrl={logoUrl} onChange={setLogoUrl} locale={locale} />
          <CenterMediaUploader field="cover" photoUrl={coverUrl} onChange={setCoverUrl} locale={locale} />
        </div>
      </Card>

      <form onSubmit={onSave} className="space-y-6">
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">{t.aboutTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.aboutHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-desc">{t.description}</Label>
            <Textarea id="cp-desc" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-city">{t.city}</Label>
              <Input id="cp-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-address">{t.address}</Label>
              <Input id="cp-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-phone">{t.phone}</Label>
              <Input id="cp-phone" dir="ltr" className="text-right" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-email">{t.email}</Label>
              <Input id="cp-email" type="email" dir="ltr" className="text-right" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="cp-website">{t.website}</Label>
              <Input id="cp-website" dir="ltr" className="text-right" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="cp-languages">
                {t.languages} <span className="font-normal text-muted-foreground">({t.languagesHint})</span>
              </Label>
              <Input id="cp-languages" value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} />
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
