"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import {
  ShieldCheck,
  ShieldAlert,
  Mail,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  Loader2,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FormDialog } from "@/components/ui/form-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { TwoFactorStatus } from "@/lib/data/security"
import type { Locale } from "@/lib/i18n"

type Step =
  | { name: "idle" }
  | { name: "enable-password" }
  | { name: "backup-codes"; codes: string[]; totpURI: string; offerTotpSetup: boolean }
  | { name: "totp-setup-password" }
  | { name: "totp-setup"; totpURI: string }
  | { name: "disable-password" }
  | { name: "regenerate-password" }
  | { name: "regenerate-codes"; codes: string[] }

const COPY = {
  ar: {
    fullyProtected: "محمي بالكامل",
    protected: "محمي",
    notEnabled: "غير مفعّل",
    intro:
      "التحقق بخطوتين يضيف طبقة حماية إضافية: حتى لو عرف أحد كلمة مرورك، لن يستطيع الدخول لحسابك بدون رمز التحقق.",
    enable: "تفعيل التحقق بخطوتين",
    disable: "إلغاء تفعيل التحقق بخطوتين",
    disableDesc: "لن يُطلب منك رمز تحقق بعد الآن عند تسجيل الدخول. يمكنك إعادة التفعيل في أي وقت.",
    email: "البريد الإلكتروني",
    emailDesc: "يُرسل رمز مكوّن من 6 أرقام إلى بريدك عند كل تسجيل دخول.",
    emailActive: "مفعّل تلقائياً",
    totp: "تطبيق المصادقة",
    totpDesc: "مثل Google Authenticator أو Authy — يعمل حتى بدون إنترنت.",
    totpVerified: "مُعد ومفعّل",
    totpNotSetup: "غير مُعد",
    setup: "إعداد",
    reSetup: "إعادة الإعداد",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "أدخلي كلمة المرور للمتابعة",
    confirm: "تأكيد",
    cancel: "إلغاء",
    continue: "متابعة",
    backupTitle: "احفظي رموز الاسترجاع",
    backupDesc:
      "استخدمي أحد هذه الرموز لتسجيل الدخول إذا فقدتِ الوصول إلى بريدك أو تطبيق المصادقة. كل رمز يُستخدم مرة واحدة فقط.",
    backupSavedConfirm: "لقد حفظت هذه الرموز في مكان آمن",
    copyAll: "نسخ الرموز",
    copied: "تم النسخ",
    finishNoTotp: "متابعة بالبريد الإلكتروني فقط",
    setupTotpNow: "إعداد تطبيق المصادقة الآن",
    totpSetupTitle: "إعداد تطبيق المصادقة",
    totpSetupDesc: "امسحي الرمز بتطبيق المصادقة، ثم أدخلي الرمز المكوّن من 6 أرقام الذي يظهر لتأكيد الإعداد.",
    manualKey: "أو أدخلي هذا المفتاح يدوياً:",
    codeLabel: "رمز التحقق",
    codePlaceholder: "000000",
    verify: "تأكيد الإعداد",
    viewBackupCodes: "عرض رموز استرجاع جديدة",
    regenerateDesc: "سيتم إلغاء الرموز القديمة فوراً — احفظي الرموز الجديدة في مكان آمن.",
    done: "تم",
    error: "حدث خطأ، حاولي مرة أخرى.",
    wrongPassword: "كلمة المرور غير صحيحة.",
    invalidCode: "الرمز غير صحيح، حاولي مرة أخرى.",
  },
  en: {
    fullyProtected: "Fully protected",
    protected: "Protected",
    notEnabled: "Not enabled",
    intro:
      "Two-factor verification adds an extra layer of protection: even if someone learns your password, they can't sign in without your verification code.",
    enable: "Enable two-factor verification",
    disable: "Disable two-factor verification",
    disableDesc: "You won't be asked for a verification code when signing in anymore. You can re-enable it anytime.",
    email: "Email",
    emailDesc: "A 6-digit code is sent to your email on every sign-in.",
    emailActive: "Active automatically",
    totp: "Authenticator app",
    totpDesc: "Like Google Authenticator or Authy — works even offline.",
    totpVerified: "Set up and active",
    totpNotSetup: "Not set up",
    setup: "Set up",
    reSetup: "Set up again",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password to continue",
    confirm: "Confirm",
    cancel: "Cancel",
    continue: "Continue",
    backupTitle: "Save your backup codes",
    backupDesc:
      "Use one of these codes to sign in if you lose access to your email or authenticator app. Each code works once.",
    backupSavedConfirm: "I've saved these codes somewhere safe",
    copyAll: "Copy codes",
    copied: "Copied",
    finishNoTotp: "Continue with email only",
    setupTotpNow: "Set up authenticator app now",
    totpSetupTitle: "Set up authenticator app",
    totpSetupDesc: "Scan the code with your authenticator app, then enter the 6-digit code it shows to confirm setup.",
    manualKey: "Or enter this key manually:",
    codeLabel: "Verification code",
    codePlaceholder: "000000",
    verify: "Confirm setup",
    viewBackupCodes: "View new backup codes",
    regenerateDesc: "Old codes will stop working immediately — save the new codes somewhere safe.",
    done: "Done",
    error: "Something went wrong, please try again.",
    wrongPassword: "Incorrect password.",
    invalidCode: "Incorrect code, please try again.",
  },
} as const

type SecurityCopy = (typeof COPY)["ar"] | (typeof COPY)["en"]

function totpSecretFromURI(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? ""
  } catch {
    return ""
  }
}

export function SecuritySettings({
  initialStatus,
  locale,
}: {
  initialStatus: TwoFactorStatus
  locale: Locale
}) {
  const t = COPY[locale]
  const [status, setStatus] = useState(initialStatus)
  const [step, setStep] = useState<Step>({ name: "idle" })
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [savedConfirmed, setSavedConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  function resetDialogState() {
    setPassword("")
    setCode("")
    setError(null)
    setBusy(false)
    setSavedConfirmed(false)
    setCopied(false)
  }

  function closeDialog() {
    setStep({ name: "idle" })
    resetDialogState()
  }

  async function handleEnable() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.enable({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.wrongPassword : t.error)
      return
    }
    setStatus((s) => ({ ...s, enabled: true, otpAvailable: true }))
    resetDialogState()
    setStep({ name: "backup-codes", codes: data.backupCodes, totpURI: data.totpURI, offerTotpSetup: true })
  }

  async function handleDisable() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.disable({ password })
    setBusy(false)
    if (err) {
      setError(err.status === 401 ? t.wrongPassword : t.error)
      return
    }
    setStatus({ enabled: false, totpVerified: false, otpAvailable: false })
    closeDialog()
  }

  async function handleVerifyTotp() {
    if (code.trim().length < 6) return
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.verifyTotp({ code: code.trim() })
    setBusy(false)
    if (err) {
      setError(t.invalidCode)
      return
    }
    setStatus((s) => ({ ...s, totpVerified: true }))
    closeDialog()
  }

  async function handleGetTotpUri() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.getTotpUri({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.wrongPassword : t.error)
      return
    }
    resetDialogState()
    setStep({ name: "totp-setup", totpURI: data.totpURI })
  }

  async function handleRegenerate() {
    if (!password) return
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.generateBackupCodes({ password })
    setBusy(false)
    if (err || !data) {
      setError(err?.status === 401 ? t.wrongPassword : t.error)
      return
    }
    resetDialogState()
    setStep({ name: "regenerate-codes", codes: data.backupCodes })
  }

  async function copyBackupCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the codes are already visible on screen.
    }
  }

  const badge = status.totpVerified
    ? { label: t.fullyProtected, icon: ShieldCheck, tone: "text-success bg-success/10" }
    : status.enabled
      ? { label: t.protected, icon: ShieldCheck, tone: "text-primary bg-primary/10" }
      : { label: t.notEnabled, icon: ShieldAlert, tone: "text-muted-foreground bg-muted" }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${badge.tone}`}>
              <badge.icon className="size-5" />
            </span>
            <div>
              <p className="font-heading font-bold text-foreground">{badge.label}</p>
              <p className="mt-0.5 max-w-md text-sm text-muted-foreground">{t.intro}</p>
            </div>
          </div>
          {!status.enabled ? (
            <Button onClick={() => setStep({ name: "enable-password" })}>{t.enable}</Button>
          ) : (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setStep({ name: "disable-password" })}
            >
              {t.disable}
            </Button>
          )}
        </div>
      </Card>

      {status.enabled && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-4.5" />
              </span>
              <p className="font-heading font-bold text-foreground">{t.email}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t.emailDesc}</p>
            <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
              <Check className="size-3.5" />
              {t.emailActive}
            </span>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="size-4.5" />
              </span>
              <p className="font-heading font-bold text-foreground">{t.totp}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t.totpDesc}</p>
            <div className="mt-auto flex items-center justify-between gap-2">
              {status.totpVerified ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                  <Check className="size-3.5" />
                  {t.totpVerified}
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {t.totpNotSetup}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep({ name: "totp-setup-password" })}
              >
                {status.totpVerified ? t.reSetup : t.setup}
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <KeyRound className="size-4.5" />
              </span>
              <p className="font-heading font-bold text-foreground">{t.viewBackupCodes}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => setStep({ name: "regenerate-password" })}
            >
              {t.viewBackupCodes}
            </Button>
          </Card>
        </div>
      )}

      {/* Enable: password confirmation */}
      <FormDialog
        open={step.name === "enable-password"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t.enable}
        description={t.passwordPlaceholder}
      >
        <PasswordStep
          t={t}
          password={password}
          setPassword={setPassword}
          error={error}
          busy={busy}
          onCancel={closeDialog}
          onConfirm={handleEnable}
        />
      </FormDialog>

      {/* Disable: password confirmation */}
      <ConfirmDialog
        open={step.name === "disable-password"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t.disable}
        description={t.disableDesc}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        tone="destructive"
        onConfirm={async () => {
          await handleDisable()
          return true
        }}
      />

      {/* Regenerate backup codes: password confirmation */}
      <FormDialog
        open={step.name === "regenerate-password"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t.viewBackupCodes}
        description={t.regenerateDesc}
      >
        <PasswordStep
          t={t}
          password={password}
          setPassword={setPassword}
          error={error}
          busy={busy}
          onCancel={closeDialog}
          onConfirm={handleRegenerate}
        />
      </FormDialog>

      {/* Backup codes display (first enable, or regenerated) */}
      <FormDialog
        open={step.name === "backup-codes" || step.name === "regenerate-codes"}
        onOpenChange={(open) => !open && step.name !== "backup-codes" && closeDialog()}
        title={t.backupTitle}
        description={t.backupDesc}
        preventClose={step.name === "backup-codes"}
      >
        {(step.name === "backup-codes" || step.name === "regenerate-codes") && (
          <div className="space-y-4">
            <div
              dir="ltr"
              className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-4 font-mono text-sm"
            >
              {step.codes.map((c) => (
                <span key={c} className="text-foreground">
                  {c}
                </span>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => copyBackupCodes(step.codes)}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t.copied : t.copyAll}
            </Button>

            {step.name === "backup-codes" ? (
              <>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
                  <Checkbox checked={savedConfirmed} onCheckedChange={(c) => setSavedConfirmed(Boolean(c))} className="mt-0.5" />
                  {t.backupSavedConfirm}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <Button
                    disabled={!savedConfirmed}
                    onClick={() => {
                      const totpURI = step.totpURI
                      resetDialogState()
                      setStep({ name: "totp-setup", totpURI })
                    }}
                  >
                    {t.setupTotpNow}
                  </Button>
                  <Button variant="outline" disabled={!savedConfirmed} onClick={closeDialog}>
                    {t.finishNoTotp}
                  </Button>
                </div>
              </>
            ) : (
              <Button className="w-full" onClick={closeDialog}>
                {t.done}
              </Button>
            )}
          </div>
        )}
      </FormDialog>

      {/* (Re-)setup authenticator app: password confirmation */}
      <FormDialog
        open={step.name === "totp-setup-password"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t.setup}
        description={t.passwordPlaceholder}
      >
        <PasswordStep
          t={t}
          password={password}
          setPassword={setPassword}
          error={error}
          busy={busy}
          onCancel={closeDialog}
          onConfirm={handleGetTotpUri}
        />
      </FormDialog>

      {/* TOTP (authenticator app) setup */}
      <FormDialog
        open={step.name === "totp-setup"}
        onOpenChange={(open) => !open && closeDialog()}
        title={t.totpSetupTitle}
        description={t.totpSetupDesc}
      >
        {step.name === "totp-setup" && (
          <TotpSetup
            t={t}
            totpURI={step.totpURI}
            code={code}
            setCode={setCode}
            error={error}
            busy={busy}
            onCancel={closeDialog}
            onConfirm={handleVerifyTotp}
          />
        )}
      </FormDialog>
    </div>
  )
}

function PasswordStep({
  t,
  password,
  setPassword,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  t: SecurityCopy
  password: string
  setPassword: (v: string) => void
  error: string | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="security-password">{t.passwordLabel}</Label>
        <Input
          id="security-password"
          type="password"
          dir="ltr"
          className="text-right"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" disabled={busy || !password} className="flex-1">
          {busy ? <Loader2 className="size-4 animate-spin" /> : t.confirm}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t.cancel}
        </Button>
      </div>
    </form>
  )
}

function TotpSetup({
  t,
  totpURI,
  code,
  setCode,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  t: SecurityCopy
  totpURI: string
  code: string
  setCode: (v: string) => void
  error: string | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(totpURI, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [totpURI])

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm()
      }}
    >
      <div className="flex justify-center">
        {qrDataUrl ? (
          // TOTP QR encodes the shared secret — rendered fully client-side
          // (the `qrcode` package), never sent to a third-party image API.
          <img src={qrDataUrl} alt="QR" width={220} height={220} className="rounded-xl border border-border" />
        ) : (
          <div className="flex size-[220px] items-center justify-center rounded-xl border border-border bg-muted/40">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">{t.manualKey}</p>
        <p dir="ltr" className="mt-1 break-all font-mono text-xs text-foreground">
          {totpSecretFromURI(totpURI)}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="totp-code">{t.codeLabel}</Label>
        <Input
          id="totp-code"
          dir="ltr"
          inputMode="numeric"
          maxLength={6}
          placeholder={t.codePlaceholder}
          className="text-center text-lg tracking-[0.3em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" disabled={busy || code.length < 6} className="flex-1">
          {busy ? <Loader2 className="size-4 animate-spin" /> : t.verify}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t.cancel}
        </Button>
      </div>
    </form>
  )
}
