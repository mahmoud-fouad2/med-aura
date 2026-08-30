"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AuthShell } from "@/components/auth/auth-shell"
import { FadeIn } from "@/components/motion"
import { localizedPath } from "@/lib/i18n/config"
import type { Dictionary, Locale } from "@/lib/i18n"

export function ResetPasswordForm({
  token,
  locale,
  home,
  authShell,
}: {
  token: string | null
  locale: Locale
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
}) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
      return
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.")
      return
    }
    if (!token) {
      setError("رابط غير صالح. أعد طلب إعادة التعيين.")
      return
    }
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (error) {
      setError("انتهت صلاحية الرابط أو أنه غير صالح. أعد المحاولة.")
      return
    }
    router.push(localizedPath("/sign-in", locale))
    router.refresh()
  }

  return (
    <AuthShell locale={locale} home={home} authShell={authShell}>
      <FadeIn>
        <Card className="rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
          {!token ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <ShieldAlert className="size-7" />
              </span>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                رابط غير صالح أو منتهي
              </h1>
              <p className="text-sm text-muted-foreground">
                رابط إعادة التعيين مفقود أو انتهت صلاحيته الأمنية.
              </p>
              <Button className="w-full rounded-xl shadow-sm" render={<Link href="/forgot-password">طلب رابط جديد</Link>} />
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  تعيين كلمة مرور جديدة
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  اختر كلمة مرور قوية ومحمية لحسابك.
                </p>
              </div>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    className="text-right"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirm"
                    type="password"
                    dir="ltr"
                    className="text-right"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </FadeIn>
    </AuthShell>
  )
}
