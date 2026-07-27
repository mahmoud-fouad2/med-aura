"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HeartPulse, ShieldAlert, Stethoscope, ChevronLeft } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { COUNTRY_CODES, countryNameAr } from "@/lib/status-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthShell } from "@/components/auth/auth-shell"
import { FadeIn } from "@/components/motion"
import { cn } from "@/lib/utils"
import type { Dictionary } from "@/lib/i18n"

type AuthDict = Dictionary["auth"]
type AccountType = "patient" | "doctor"

export function AuthForm({
  mode,
  dict,
  home,
  authShell,
  nextPath,
  accountDisabled,
  initialType,
  googleEnabled,
  googleError,
}: {
  mode: "sign-in" | "sign-up"
  dict: AuthDict
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
  nextPath?: string
  accountDisabled?: boolean
  /** Preselects the account type (e.g. /sign-up?type=doctor) and skips the choice step. */
  initialType?: AccountType
  /** Server-computed from isGoogleAuthConfigured() — hidden entirely, not
   *  just disabled, when Google isn't configured. */
  googleEnabled?: boolean
  /** Bounced back from a failed Google OAuth callback (?googleError=1). */
  googleError?: boolean
}) {
  const router = useRouter()
  const [accountType, setAccountType] = useState<AccountType | null>(
    initialType ?? null,
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [agree, setAgree] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(
    googleError ? "تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى." : null,
  )
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Survives a failed profile save so retrying doesn't hit "email exists".
  const [accountCreated, setAccountCreated] = useState(false)

  const isSignUp = mode === "sign-up"
  const destination = nextPath || "/dashboard"

  const handleGoogle = async () => {
    setError(null)
    setGoogleLoading(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      // Returning users land where they were headed; a first-time Google
      // sign-up never collected phone/country, so it detours through the
      // same completion step the email/password flow fills synchronously.
      callbackURL: destination,
      newUserCallbackURL: `/complete-profile?next=${encodeURIComponent(destination)}`,
      errorCallbackURL: `/sign-in?googleError=1${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`,
    })
    if (error) {
      setGoogleLoading(false)
      setError(translateAuthError(error.message))
    }
    // On success the browser navigates away to Google — no further state change here.
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isSignUp && !agree) {
      setError("يلزم الموافقة على الشروط وسياسة الخصوصية للمتابعة.")
      return
    }
    setLoading(true)

    if (!isSignUp) {
      const { error } = await authClient.signIn.email({
        email,
        password,
        rememberMe: remember,
      })
      setLoading(false)
      if (error) {
        setError(translateAuthError(error.message))
        return
      }
      router.push(destination)
      router.refresh()
      return
    }

    // No `role` is ever sent — public signup always creates a PATIENT.
    // Choosing "doctor" only routes into the accreditation application.
    if (!accountCreated) {
      const { error } = await authClient.signUp.email({ email, password, name })
      if (error) {
        setLoading(false)
        setError(translateAuthError(error.message))
        return
      }
      setAccountCreated(true)
    }

    const profile = await completeSignupProfile({
      accountType: accountType ?? "patient",
      phone,
      residenceCountry: country,
      city: city || undefined,
    })
    if (!profile.ok) {
      setLoading(false)
      setError(
        accountCreated && profile.error.includes("تسجيل الدخول")
          ? "تم إنشاء الحساب. سجّل الدخول لإكمال بياناتك."
          : profile.error,
      )
      return
    }
    // Hard navigation on purpose: right after the server action resolves,
    // router.push + router.refresh race each other (refresh re-renders the
    // current route and cancels the pending push, leaving the user stuck on
    // /sign-up). A full document load also picks up the fresh session
    // server-side in one step. Loading stays on until the page unloads.
    window.location.assign(nextPath || profile.next)
  }

  // Sign-up starts by choosing the account type (unless preselected via URL).
  const showTypeChoice = isSignUp && accountType === null

  return (
    <AuthShell home={home} authShell={authShell}>
      <FadeIn>
        <Card className="p-6 shadow-elegant sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {isSignUp ? dict.signUpTitle : dict.signInTitle}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {showTypeChoice
                ? "اختر نوع الحساب لنجهّز لك التجربة المناسبة"
                : isSignUp
                  ? dict.signUpSubtitle
                  : dict.signInSubtitle}
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

          {googleEnabled && (
            <div className="mb-5 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={googleLoading}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elegant disabled:pointer-events-none disabled:opacity-60"
              >
                <GoogleGlyph className="size-4.5" />
                {googleLoading
                  ? "يرجى الانتظار…"
                  : isSignUp
                    ? "إنشاء حساب عبر Google"
                    : "الدخول عبر Google"}
              </button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                أو
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          {showTypeChoice ? (
            <div className="flex flex-col gap-3">
              <TypeChoiceCard
                icon={HeartPulse}
                title="أنا مريض"
                description="أبحث عن إجراء تجميلي وأريد استشارة ومتابعة موثوقة من مكان واحد."
                onClick={() => setAccountType("patient")}
              />
              <TypeChoiceCard
                icon={Stethoscope}
                title="أنا طبيب"
                description="أقدّم خدمات تجميلية وأرغب بالانضمام للمنصة بعد التحقق من الترخيص."
                onClick={() => setAccountType("doctor")}
              />
              <p className="mt-1 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                حسابات الأطباء والمراكز تمر بمراجعة واعتماد قبل الظهور على
                المنصة — حفاظًا على ثقة المرضى.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <>
                  <button
                    type="button"
                    onClick={() => setAccountType(null)}
                    className="group -mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ChevronLeft className="size-3.5 rtl:rotate-180" />
                    {accountType === "doctor" ? "حساب طبيب" : "حساب مريض"} —
                    تغيير النوع
                  </button>

                  {accountType === "doctor" && (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
                      بعد إنشاء الحساب ستنتقل مباشرة لاستكمال{" "}
                      <span className="font-bold">طلب اعتماد الطبيب</span>{" "}
                      (الترخيص، التخصص، وسنوات الخبرة) ليراجعه فريق الامتثال.
                    </p>
                  )}

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
                </>
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

              {isSignUp && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      className="text-right"
                      placeholder="+9665xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="country">دولة الإقامة</Label>
                      <select
                        id="country"
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                      >
                        <option value="" disabled>
                          اختر الدولة
                        </option>
                        {COUNTRY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {countryNameAr(code)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="city">
                        المدينة{" "}
                        <span className="font-normal text-muted-foreground">
                          (اختياري)
                        </span>
                      </Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-foreground">
                    <Checkbox
                      checked={agree}
                      onCheckedChange={(c) => setAgree(Boolean(c))}
                      className="mt-0.5"
                    />
                    <span>
                      أوافق على{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        الشروط والأحكام
                      </Link>{" "}
                      و{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        سياسة الخصوصية
                      </Link>
                      ، وأقر بأن المنصة وسيط للتواصل مع مقدّمي الخدمة ولا تقدم
                      نصيحة طبية.
                    </span>
                  </label>
                </>
              )}

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
                    ? accountType === "doctor"
                      ? "إنشاء الحساب ومتابعة طلب الاعتماد"
                      : dict.signUpTitle
                    : dict.signInTitle}
              </Button>
            </form>
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

function TypeChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3.5 rounded-xl border border-border bg-card p-4 text-start transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-elegant",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-200 group-hover:scale-105">
        <Icon className="size-5.5" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-heading text-base font-bold text-foreground">
          {title}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronLeft className="ms-auto mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-primary rtl:rotate-0 ltr:rotate-180" />
    </button>
  )
}

/** The standard four-color "G" mark — brand colors are fixed by Google's
 *  guidelines, not the app's theme. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.6 27 35.6 24 35.6c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.7 35.9 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}

function translateAuthError(message?: string): string {
  if (!message) return "حدث خطأ ما، حاول مرة أخرى."
  const m = message.toLowerCase()
  if (m.includes("invalid") && m.includes("password"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
  if (m.includes("password") && (m.includes("short") || m.includes("length") || m.includes("8")))
    return "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
  if (m.includes("credential")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
  if (m.includes("exist") || m.includes("already")) return "هذا البريد الإلكتروني مسجّل بالفعل."
  if (m.includes("email")) return "يرجى إدخال بريد إلكتروني صحيح."
  if (m.includes("origin") || m.includes("csrf") || m.includes("cors"))
    return "تعذّر التحقق من مصدر الطلب. حدّث الصفحة وحاول مرة أخرى."
  if (m.includes("rate")) return "عدد المحاولات كبير، انتظر قليلًا ثم حاول مرة أخرى."
  return "تعذّر إتمام العملية، حاول مرة أخرى."
}
