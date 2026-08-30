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

export function ForgotPasswordForm({
  locale,
  home,
  authShell,
}: {
  locale: Locale
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
}) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: localizedPath("/reset-password", locale),
    })
    setLoading(false)
    // Do not reveal whether the email exists.
    if (error && error.status !== 200) {
      setSent(true)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell locale={locale} home={home} authShell={authShell}>
      <FadeIn>
        <Card className="rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
                <MailCheck className="size-7" />
              </span>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                تحقّق من بريدك الإلكتروني
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                إذا كان هذا البريد مسجّلًا لدينا، فستصلك رسالة تحتوي على رابط
                لإعادة تعيين كلمة المرور بكل أمان. تحقّق أيضًا من مجلد البريد غير الهام (Spam).
              </p>
              <Button variant="outline" className="w-full rounded-xl" render={<Link href="/sign-in">العودة لتسجيل الدخول</Link>} />
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  إعادة تعيين كلمة المرور
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور.
                </p>
              </div>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
                <Button type="submit" disabled={loading} className="w-full rounded-xl shadow-sm" size="lg">
                  {loading ? "جارٍ الإرسال…" : "إرسال رابط الإعادة"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                تذكّرت كلمة المرور؟{" "}
                <Link href="/sign-in" className="font-medium text-primary hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </>
          )}
        </Card>
      </FadeIn>
    </AuthShell>
  )
}
