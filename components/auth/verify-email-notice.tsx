"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AuthShell } from "@/components/auth/auth-shell"
import { FadeIn } from "@/components/motion"
import { localizedPath } from "@/lib/i18n/config"
import type { Dictionary, Locale } from "@/lib/i18n"

export function VerifyEmailNotice({
  defaultEmail,
  locale,
  home,
  authShell,
}: {
  defaultEmail?: string
  locale: Locale
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
}) {
  const [email, setEmail] = useState(defaultEmail ?? "")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: localizedPath("/dashboard", locale),
    })
    setLoading(false)
    if (error) {
      setError("تعذّر إرسال الرسالة. تأكد من البريد وحاول مجددًا.")
      return
    }
    setDone(true)
  }

  return (
    <AuthShell locale={locale} home={home} authShell={authShell}>
      <FadeIn>
        <Card className="rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              تأكيد وتفعيل بريدكِ الإلكتروني
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              أرسلنا رابط تفعيل آمن إلى بريدكِ. افتحي الرسالة واضغطي الرابط للتحقق من ملكية الحساب.
              لم تصلكِ الرسالة؟ يمكنكِ طلب إعادة إرسالها فوراً.
            </p>
          </div>

          {done ? (
            <p className="mt-6 rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success">
              تم إرسال رابط التفعيل مجددًا.
            </p>
          ) : (
            <form onSubmit={resend} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  className="text-right"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "جارٍ الإرسال…" : "إعادة إرسال رابط التفعيل"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              المتابعة إلى لوحة التحكم
            </Link>
          </p>
        </Card>
      </FadeIn>
    </AuthShell>
  )
}
