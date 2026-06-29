"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { submitContactMessage } from "@/lib/actions/contact"

export function ContactForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await submitContactMessage({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? "") || undefined,
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="font-heading text-xl font-bold text-foreground">
          تم استلام رسالتك
        </h3>
        <p className="text-muted-foreground">
          شكرًا لتواصلك معنا. سيقوم فريقنا بالرد عليك في أقرب وقت ممكن.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6 shadow-elegant sm:p-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="الاسم الكامل" required />
          <Field name="email" label="البريد الإلكتروني" type="email" required dir="ltr" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="phone" label="رقم الهاتف (اختياري)" dir="ltr" />
          <Field name="subject" label="الموضوع" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="message">رسالتك</Label>
          <Textarea id="message" name="message" rows={5} required />
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "جارٍ الإرسال…" : "إرسال الرسالة"}
        </Button>
      </form>
    </Card>
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
