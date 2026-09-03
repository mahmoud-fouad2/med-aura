"use client"

import { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { HeartPulse, Ruler, Weight, ShieldCheck, ChevronLeft } from "lucide-react"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { saveProfileWizardDetails, skipProfileWizard } from "@/lib/actions/patient-profile"
import { COUNTRY_CODES, countryNameAr, countryNameEn } from "@/lib/status-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { FadeIn } from "@/components/motion"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

type Step = "contact" | "about"

const COPY = {
  ar: {
    contactTitle: "خطوة أخيرة لإتمام ملفك",
    contactSubtitle: "نحتاج رقم جوالك ودولة إقامتك لتخصيص الاستشارات والمواعيد الأنسب لك.",
    phone: "رقم الجوال",
    country: "دولة الإقامة",
    selectCountry: "اختر الدولة",
    city: "المدينة",
    optional: "(اختياري)",
    continue: "متابعة",
    pleaseWait: "يرجى الانتظار…",
    aboutTitle: "عرّفنا أكثر عن نفسك",
    aboutSubtitle: "معلومات اختيارية تساعد طبيبك على تقييم حالتك بدقة أكبر عند الاستشارة.",
    dob: "تاريخ الميلاد",
    sex: "الجنس",
    male: "ذكر",
    female: "أنثى",
    height: "الطول (سم)",
    weight: "الوزن (كجم)",
    finish: "إنهاء",
    skip: "تخطي الآن",
    back: "رجوع",
    step: (n: number, total: number) => `الخطوة ${n} من ${total}`,
  },
  en: {
    contactTitle: "One last step to finish your profile",
    contactSubtitle: "We need your phone number and country of residence to tailor consultations and appointments.",
    phone: "Phone number",
    country: "Country of residence",
    selectCountry: "Select country",
    city: "City",
    optional: "(optional)",
    continue: "Continue",
    pleaseWait: "Please wait…",
    aboutTitle: "Tell us more about yourself",
    aboutSubtitle: "Optional details that help your doctor assess your case more accurately.",
    dob: "Date of birth",
    sex: "Sex",
    male: "Male",
    female: "Female",
    height: "Height (cm)",
    weight: "Weight (kg)",
    finish: "Finish",
    skip: "Skip for now",
    back: "Back",
    step: (n: number, total: number) => `Step ${n} of ${total}`,
  },
} as const

const EASE = [0.22, 1, 0.36, 1] as const

export function ProfileWizard({
  destination,
  startStep,
  locale = "ar",
  defaultPhone = "",
  defaultCountry = "",
}: {
  destination: string
  /** "contact" for a fresh Google sign-up (nothing collected yet); "about"
   *  when phone/country already exist (email/password signups, or any
   *  returning patient who's never seen this step). */
  startStep: Step
  locale?: Locale
  defaultPhone?: string
  defaultCountry?: string
}) {
  const t = COPY[locale]
  const steps: Step[] = startStep === "contact" ? ["contact", "about"] : ["about"]
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const [direction, setDirection] = useState(1)
  const reduce = useReducedMotion()

  const [phone, setPhone] = useState(defaultPhone)
  const [country, setCountry] = useState(defaultCountry)
  const [city, setCity] = useState("")
  const [dob, setDob] = useState("")
  const [sex, setSex] = useState<"male" | "female" | null>(null)
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function goTo(next: number) {
    setDirection(next > stepIndex ? 1 : -1)
    setStepIndex(next)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await completeSignupProfile({
      accountType: "patient",
      phone,
      residenceCountry: country,
      city: city || undefined,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (steps.length > stepIndex + 1) {
      goTo(stepIndex + 1)
    } else {
      window.location.assign(destination)
    }
  }

  async function finishAbout() {
    setError(null)
    setLoading(true)
    const h = Number(height)
    const w = Number(weight)
    const result = await saveProfileWizardDetails({
      dateOfBirth: dob || undefined,
      biologicalSex: sex ?? undefined,
      heightCm: height.trim() && Number.isFinite(h) ? h : undefined,
      weightKg: weight.trim() && Number.isFinite(w) ? w : undefined,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    window.location.assign(destination)
  }

  async function handleSkip() {
    setLoading(true)
    await skipProfileWizard()
    window.location.assign(destination)
  }

  return (
    <FadeIn>
      <Card className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
        {steps.length > 1 && (
          <div
            className="mb-6 flex items-center justify-center gap-1.5"
            role="progressbar"
            aria-label={t.step(stepIndex + 1, steps.length)}
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          >
            {steps.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {step === "contact" ? (
              <>
                <div className="mb-6 text-center">
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {t.contactTitle}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t.contactSubtitle}
                  </p>
                </div>

                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cp-phone">{t.phone}</Label>
                    <Input
                      id="cp-phone"
                      type="tel"
                      dir="ltr"
                      className="text-right"
                      placeholder="+9665xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="cp-country">{t.country}</Label>
                      <select
                        id="cp-country"
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                      >
                        <option value="" disabled>
                          {t.selectCountry}
                        </option>
                        {COUNTRY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {locale === "ar" ? countryNameAr(code) : countryNameEn(code)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="cp-city">
                        {t.city} <span className="font-normal text-muted-foreground">{t.optional}</span>
                      </Label>
                      <Input
                        id="cp-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? t.pleaseWait : t.continue}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 flex flex-col items-center text-center">
                  <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HeartPulse className="size-5.5" />
                  </span>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {t.aboutTitle}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t.aboutSubtitle}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cp-dob">{t.dob}</Label>
                    <Input
                      id="cp-dob"
                      type="date"
                      dir="ltr"
                      max={new Date().toISOString().slice(0, 10)}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
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
                      <Label htmlFor="cp-height">
                        <span className="inline-flex items-center gap-1.5">
                          <Ruler className="size-3.5" /> {t.height}
                        </span>
                      </Label>
                      <Input
                        id="cp-height"
                        type="number"
                        inputMode="numeric"
                        dir="ltr"
                        min={30}
                        max={280}
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="cp-weight">
                        <span className="inline-flex items-center gap-1.5">
                          <Weight className="size-3.5" /> {t.weight}
                        </span>
                      </Label>
                      <Input
                        id="cp-weight"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        dir="ltr"
                        min={1}
                        max={500}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button onClick={() => void finishAbout()} disabled={loading} className="w-full" size="lg">
                    {loading ? (
                      t.pleaseWait
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="size-4" /> {t.finish}
                      </span>
                    )}
                  </Button>
                  <div className="flex items-center justify-between">
                    {steps.length > 1 && stepIndex > 0 ? (
                      <button
                        type="button"
                        onClick={() => goTo(stepIndex - 1)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="size-3.5 rtl:rotate-180" /> {t.back}
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSkip()}
                      disabled={loading}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {t.skip}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </FadeIn>
  )
}
