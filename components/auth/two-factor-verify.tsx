"use client"

import { useEffect, useState } from "react"
import { Mail, Smartphone, KeyRound, Loader2, ChevronLeft } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { Locale } from "@/lib/i18n"

type Method = "otp" | "totp" | "backup"

const COPY = {
  ar: {
    title: "التحقق من هويتك",
    subtitleOtp: "أرسلنا رمزاً مكوّناً من 6 أرقام إلى بريدك الإلكتروني.",
    subtitleTotp: "أدخلي الرمز الظاهر في تطبيق المصادقة.",
    subtitleBackup: "أدخلي أحد رموز الاسترجاع التي حفظتِها.",
    codeLabel: "رمز التحقق",
    backupLabel: "رمز الاسترجاع",
    verify: "تحقق",
    resend: "إعادة إرسال الرمز",
    resent: "تم إرسال رمز جديد.",
    trustDevice: "تذكّر هذا الجهاز لمدة 30 يوماً",
    useOtp: "استخدام البريد الإلكتروني بدلاً من ذلك",
    useTotp: "استخدام تطبيق المصادقة بدلاً من ذلك",
    useBackup: "استخدام رمز احتياطي بدلاً من ذلك",
    back: "رجوع",
    invalidCode: "الرمز غير صحيح، حاولي مرة أخرى.",
    tooManyAttempts: "محاولات كثيرة، اطلبي رمزاً جديداً.",
    genericError: "حدث خطأ، حاولي مرة أخرى.",
  },
  en: {
    title: "Verify your identity",
    subtitleOtp: "We sent a 6-digit code to your email.",
    subtitleTotp: "Enter the code shown in your authenticator app.",
    subtitleBackup: "Enter one of the backup codes you saved.",
    codeLabel: "Verification code",
    backupLabel: "Backup code",
    verify: "Verify",
    resend: "Resend code",
    resent: "A new code has been sent.",
    trustDevice: "Trust this device for 30 days",
    useOtp: "Use email instead",
    useTotp: "Use authenticator app instead",
    useBackup: "Use a backup code instead",
    back: "Back",
    invalidCode: "Incorrect code, please try again.",
    tooManyAttempts: "Too many attempts — request a new code.",
    genericError: "Something went wrong, please try again.",
  },
} as const

/**
 * Rendered instead of the sign-in form once signIn.email() comes back with
 * `twoFactorRedirect` — the credential was right, but the account has a
 * second factor enabled. `methods` is exactly what the server reports the
 * account can actually complete right now (see lib/auth.ts's twoFactor
 * plugin after-hook), so this never offers a method the account hasn't set
 * up.
 */
export function TwoFactorVerify({
  locale,
  methods,
  destination,
  onBack,
}: {
  locale: Locale
  methods: string[]
  destination: string
  onBack: () => void
}) {
  const t = COPY[locale]
  const hasOtp = methods.includes("otp")
  const hasTotp = methods.includes("totp")
  const [method, setMethod] = useState<Method>(hasOtp ? "otp" : "totp")
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  // Starts true when the initial method is already "otp" (lazy init, not a
  // setState call inside the effect below), so the first send on mount is
  // covered without the effect needing to flip it on synchronously.
  const [sendingOtp, setSendingOtp] = useState(hasOtp)

  // Fire the email as soon as this step mounts on the "otp" method, and
  // again whenever switching back into it — the code only exists once sent.
  useEffect(() => {
    if (method !== "otp") return
    authClient.twoFactor
      .sendOtp()
      .catch(() => undefined)
      .finally(() => setSendingOtp(false))
  }, [method])

  function switchMethod(next: Method) {
    setMethod(next)
    setCode("")
    setError(null)
    setResent(false)
    if (next === "otp") setSendingOtp(true)
  }

  async function handleResend() {
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.sendOtp()
    setBusy(false)
    if (err) {
      setError(t.genericError)
      return
    }
    setResent(true)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError(null)

    const call =
      method === "otp"
        ? authClient.twoFactor.verifyOtp({ code: code.trim(), trustDevice })
        : method === "totp"
          ? authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
          : authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })

    const { error: err } = await call
    if (err) {
      setBusy(false)
      setError(
        err.status === 429
          ? t.tooManyAttempts
          : method === "backup"
            ? t.invalidCode
            : t.invalidCode,
      )
      return
    }
    // Same hard-navigation reasoning as the rest of auth-form.tsx: a fresh
    // document load picks up the just-created session server-side in one
    // step, instead of racing router.push against router.refresh.
    window.location.assign(destination)
  }

  const icon = method === "otp" ? Mail : method === "totp" ? Smartphone : KeyRound
  const Icon = icon
  const subtitle =
    method === "otp" ? t.subtitleOtp : method === "totp" ? t.subtitleTotp : t.subtitleBackup

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="group text-primary -mt-2 mb-4 inline-flex w-fit items-center gap-1 text-xs font-medium hover:underline"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" />
        {t.back}
      </button>

      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5.5" />
        </span>
        <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{subtitle}</p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="tf-code">{method === "backup" ? t.backupLabel : t.codeLabel}</Label>
          <Input
            id="tf-code"
            dir="ltr"
            inputMode={method === "backup" ? "text" : "numeric"}
            maxLength={method === "backup" ? 12 : 6}
            className="text-center text-lg tracking-[0.3em]"
            value={code}
            onChange={(e) =>
              setCode(method === "backup" ? e.target.value : e.target.value.replace(/\D/g, ""))
            }
            autoFocus
            disabled={sendingOtp}
            required
          />
        </div>

        {method === "otp" && (
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={busy || sendingOtp}
            className="text-primary w-fit text-xs font-medium hover:underline disabled:opacity-60"
          >
            {resent ? t.resent : t.resend}
          </button>
        )}

        <label className="text-foreground flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked={trustDevice} onCheckedChange={(c) => setTrustDevice(Boolean(c))} />
          {t.trustDevice}
        </label>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || sendingOtp || !code.trim()} className="mt-1">
          {busy ? <Loader2 className="size-4 animate-spin" /> : t.verify}
        </Button>

        <div className="mt-1 flex flex-col items-center gap-1.5 text-xs">
          {method !== "otp" && hasOtp && (
            <button type="button" onClick={() => switchMethod("otp")} className="text-primary hover:underline">
              {t.useOtp}
            </button>
          )}
          {method !== "totp" && hasTotp && (
            <button type="button" onClick={() => switchMethod("totp")} className="text-primary hover:underline">
              {t.useTotp}
            </button>
          )}
          {method !== "backup" && (
            <button
              type="button"
              onClick={() => switchMethod("backup")}
              className="text-muted-foreground hover:underline"
            >
              {t.useBackup}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
