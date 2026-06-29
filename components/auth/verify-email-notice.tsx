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

export function VerifyEmailNotice({ defaultEmail }: { defaultEmail?: string }) {
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
      callbackURL: "/dashboard",
    })
    setLoading(false)
    if (error) {
      setError("تعذّر إرسال الرسالة. تأكد من البريد وحاول مجددًا.")
      return
    }
    setDone(true)
  }

  return (
    <AuthShell>
      <FadeIn>
        <Card className="p-6 shadow-elegant sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              فعّل بريدك الإلكتروني
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              أرسلنا رابط تفعيل إلى بريدك. افتح الرسالة واضغط الرابط لتفعيل حسابك.
              لم تصلك الرسالة؟ يمكنك إعادة الإرسال.
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
