"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import type { Dictionary } from "@/lib/i18n"

type AuthDict = Dictionary["auth"]

export function AuthForm({
  mode,
  dict,
  nextPath,
}: {
  mode: "sign-in" | "sign-up"
  dict: AuthDict
  nextPath?: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"
  const destination = nextPath || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // NOTE: no `role` is ever sent. Public signup always creates a PATIENT;
    // the server ignores client-provided roles (input:false in auth config).
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(translateAuthError(error.message))
      return
    }

    router.push(destination)
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <Logo />
        </Link>

        <Card className="p-6">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {isSignUp ? dict.signUpTitle : dict.signInTitle}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {isSignUp ? dict.signUpSubtitle : dict.signInSubtitle}
            </p>
          </div>

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
              <Label htmlFor="password">{dict.password}</Label>
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

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
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
      </div>
    </main>
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
