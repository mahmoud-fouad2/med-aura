"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { submitContactMessage } from "@/lib/actions/contact"
import type { Locale } from "@/lib/i18n"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { FadeIn } from "@/components/motion"

export function ContactForm({ locale = "ar" }: { locale?: Locale }) {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!recaptchaKey) {
    return <ContactFormInner locale={locale} />
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey} language={locale}>
      <ContactFormInner locale={locale} />
    </GoogleReCaptchaProvider>
  )
}

function ContactFormInner({ locale = "ar" }: { locale?: Locale }) {
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    let token = undefined
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && executeRecaptcha) {
      try {
        token = await executeRecaptcha("contact")
      } catch (err) {
        setLoading(false)
        setError(l("فشل التحقق من الأمان، يرجى المحاولة لاحقاً.", "Security check failed, please try again later."))
        return
      }
    }

    const fd = new FormData(e.currentTarget)
    const res = await submitContactMessage({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? "") || undefined,
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
      recaptchaToken: token,
    })
    setLoading(false)
    if (!res.ok) {
      setError(isAr ? res.error : "We could not send your message. Please review the fields and try again.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <FadeIn>
        <Card className="flex flex-col items-center gap-4 rounded-3xl p-10 text-center shadow-elegant border-border/80 bg-card/95 backdrop-blur-md" aria-live="polite">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="size-8" />
          </span>
          <h3 className="font-heading text-2xl font-bold text-foreground mt-2">
            {l("تم استلام رسالتك", "Your message has been received")}
          </h3>
          <p className="text-muted-foreground text-base">
            {l("شكرًا لتواصلك معنا. سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.", "Thank you for contacting us. Our team will reply as soon as possible.")}
          </p>
        </Card>
      </FadeIn>
    )
  }

  return (
    <FadeIn>
      <Card className="rounded-3xl p-6 sm:p-10 shadow-elegant border-border/80 bg-card/95 backdrop-blur-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field name="name" label={l("الاسم الكامل", "Full name")} required />
            <Field name="email" label={l("البريد الإلكتروني", "Email address")} type="email" required dir="ltr" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field name="phone" label={l("رقم الهاتف (اختياري)", "Phone (optional)")} dir="ltr" />
            <Field name="subject" label={l("الموضوع", "Subject")} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="message">{l("رسالتك", "Message")}</Label>
            <Textarea id="message" name="message" rows={6} className="resize-none" required />
          </div>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full sm:w-auto sm:self-end">
            {loading ? l("جارٍ الإرسال…", "Sending…") : l("إرسال الرسالة", "Send message")}
          </Button>
        </form>
      </Card>
    </FadeIn>
  )
}

function Field({
  name,
  label,
  type = "text",
  required,
  dir,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  dir?: "ltr" | "rtl"
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        dir={dir}
        className={dir === "ltr" ? "text-right" : undefined}
      />
    </div>
  )
}
