"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthShell } from "@/components/auth/auth-shell"
import { FadeIn } from "@/components/motion"
import type { Dictionary } from "@/lib/i18n"

type AuthDict = Dictionary["auth"]

export function AuthForm({
  mode,
  dict,
  nextPath,
  accountDisabled,
}: {
  mode: "sign-in" | "sign-up"
  dict: AuthDict
  nextPath?: string
  accountDisabled?: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"
  const destination = nextPath || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // No `role` is ever sent — public signup always creates a PATIENT.
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password, rememberMe: remember })

    setLoading(false)
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    router.push(destination)
    router.refresh()
  }

  return (
    <AuthShell>
      <FadeIn>
        <Card className="p-6 shadow-elegant sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {isSignUp ? dict.signUpTitle : dict.signInTitle}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {isSignUp ? dict.signUpSubtitle : dict.signInSubtitle}
            </p>
          </div>

          {accountDisabled && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
            >
              <ShieldAlert className="mt-0.5 size-4.5 shrink-0" />
              <span>
                تم تعطيل هذا الحساب. إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق
                الدعم لمراجعة حالة حسابك.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{dict.name}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{dict.email}</Label>
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{dict.password}</Label>
                {!isSignUp && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                dir="ltr"
                className="text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {!isSignUp && (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(c) => setRemember(Boolean(c))}
                />
                تذكّرني على هذا الجهاز
              </label>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading
                ? "يرجى الانتظار…"
                : isSignUp
                  ? dict.signUpTitle
                  : dict.signInTitle}
            </Button>
          </form>

          {isSignUp && (
            <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              {dict.providerNote}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? dict.haveAccount : dict.noAccount}{" "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {isSignUp ? dict.signInTitle : dict.signUpTitle}
            </Link>
          </p>
        </Card>
      </FadeIn>
    </AuthShell>
  )
}

function translateAuthError(message?: string): string {
  if (!message) return "حدث خطأ ما، حاول مرة أخرى."
  const m = message.toLowerCase()
  if (m.includes("invalid") && m.includes("password"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
  if (m.includes("credential")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
  if (m.includes("exist")) return "هذا البريد الإلكتروني مسجّل بالفعل."
  if (m.includes("email")) return "يرجى إدخال بريد إلكتروني صحيح."
  return "تعذّر إتمام العملية، حاول مرة أخرى."
}
