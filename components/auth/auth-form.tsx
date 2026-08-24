"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HeartPulse, ShieldAlert, Stethoscope, ChevronLeft } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { COUNTRY_CODES, countryNameAr, countryNameEn } from "@/lib/status-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthShell } from "@/components/auth/auth-shell"
import { FadeIn } from "@/components/motion"
import { cn } from "@/lib/utils"
import type { Dictionary, Locale } from "@/lib/i18n"

type AuthDict = Dictionary["auth"]
type AccountType = "patient" | "doctor"

export function AuthForm({
  mode,
  locale,
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
  locale: Locale
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
  const copy = AUTH_COPY[locale]
  const [accountType, setAccountType] = useState<AccountType | null>(initialType ?? null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [agree, setAgree] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(googleError ? copy.googleError : null)
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
      setError(translateAuthError(error.message, locale))
    }
    // On success the browser navigates away to Google — no further state change here.
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isSignUp && !agree) {
      setError(copy.termsRequired)
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
        setError(translateAuthError(error.message, locale))
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
        setError(translateAuthError(error.message, locale))
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
          ? copy.accountCreatedSignIn
          : translateProfileError(profile.error, locale),
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
        <Card className="rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              {isSignUp ? dict.signUpTitle : dict.signInTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {showTypeChoice
                ? copy.chooseAccountType
                : isSignUp
                  ? dict.signUpSubtitle
                  : dict.signInSubtitle}
            </p>
          </div>

          {accountDisabled && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm"
            >
              <ShieldAlert className="mt-0.5 size-4.5 shrink-0" />
              <span>{copy.accountDisabled}</span>
            </div>
          )}

          {googleEnabled && (
            <div className="mb-5 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={googleLoading}
                className="border-border/80 bg-card text-foreground hover:shadow-elegant flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 disabled:pointer-events-none disabled:opacity-60"
              >
                <GoogleGlyph className="size-4.5" />
                {googleLoading ? copy.loading : isSignUp ? copy.googleSignUp : copy.googleSignIn}
              </button>
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                {copy.or}
                <span className="bg-border h-px flex-1" />
              </div>
            </div>
          )}

          {showTypeChoice ? (
            <div className="flex flex-col gap-3.5">
              <TypeChoiceCard
                icon={HeartPulse}
                title={copy.patientTitle}
                description={copy.patientDescription}
                onClick={() => setAccountType("patient")}
              />
              <TypeChoiceCard
                icon={Stethoscope}
                title={copy.doctorTitle}
                description={copy.doctorDescription}
                onClick={() => setAccountType("doctor")}
              />
              <p className="bg-muted/60 text-muted-foreground mt-1 rounded-xl p-3.5 text-xs leading-relaxed border border-border/60">
                {copy.providerReviewNote}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <>
                  <button
                    type="button"
                    onClick={() => setAccountType(null)}
                    className="group text-primary -mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium hover:underline"
                  >
                    <ChevronLeft className="size-3.5 rtl:rotate-180" />
                    {accountType === "doctor" ? copy.doctorAccount : copy.patientAccount}{" "}
                    {copy.changeType}
                  </button>

                  {accountType === "doctor" && (
                    <p className="border-primary/20 bg-primary/5 text-foreground rounded-lg border p-3 text-xs leading-relaxed">
                      {copy.doctorNextPrefix}{" "}
                      <span className="font-bold">{copy.doctorApplication}</span>{" "}
                      {copy.doctorNextSuffix}
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
                      className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                    >
                      {copy.forgotPassword}
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
                    <Label htmlFor="phone">{copy.phone}</Label>
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
                      <Label htmlFor="country">{copy.country}</Label>
                      <select
                        id="country"
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm"
                      >
                        <option value="" disabled>
                          {copy.chooseCountry}
                        </option>
                        {COUNTRY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {locale === "ar" ? countryNameAr(code) : countryNameEn(code)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="city">
                        {copy.city}{" "}
                        <span className="text-muted-foreground font-normal">{copy.optional}</span>
                      </Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>

                  <label className="text-foreground flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed">
                    <Checkbox
                      checked={agree}
                      onCheckedChange={(c) => setAgree(Boolean(c))}
                      className="mt-0.5"
                    />
                    <span>
                      {copy.agreePrefix}{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        {copy.terms}
                      </Link>{" "}
                      {copy.and}{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        {copy.privacy}
                      </Link>
                      {copy.medicalDisclaimer}
                    </span>
                  </label>
                </>
              )}

              {!isSignUp && (
                <label className="text-foreground flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox checked={remember} onCheckedChange={(c) => setRemember(Boolean(c))} />
                  {copy.rememberMe}
                </label>
              )}

              {error && (
                <p
                  className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading
                  ? copy.loading
                  : isSignUp
                    ? accountType === "doctor"
                      ? copy.createDoctorAccount
                      : dict.signUpTitle
                    : dict.signInTitle}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground mt-6 text-center text-sm">
            {isSignUp ? dict.haveAccount : dict.noAccount}{" "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-primary font-medium underline-offset-4 hover:underline"
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
        "group border-border/80 bg-card flex items-start gap-4 rounded-2xl border p-4.5 text-start transition-all duration-300 shadow-sm",
        "hover:border-primary/50 hover:bg-secondary/30 hover:shadow-elegant hover:-translate-y-1",
      )}
    >
      <span className="bg-primary/10 text-primary ring-primary/20 flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105 shadow-sm">
        <Icon className="size-6" />
      </span>
      <span className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="font-heading text-foreground text-base font-bold">{title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
      </span>
      <ChevronLeft className="text-muted-foreground group-hover:text-primary ms-auto mt-2 size-4 shrink-0 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 rtl:rotate-0" />
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

const AUTH_COPY = {
  ar: {
    googleError: "تعذّر تسجيل الدخول عبر Google. حاول مرة أخرى.",
    termsRequired: "يلزم الموافقة على الشروط وسياسة الخصوصية للمتابعة.",
    accountCreatedSignIn: "تم إنشاء الحساب بنجاح. سجّلي الدخول لإكمال بياناتكِ.",
    chooseAccountType: "اختر نوع الحساب لنجهّز لكِ التجربة والرعاية التجميلية الأنسب",
    accountDisabled: "تم تعطيل هذا الحساب. تواصل مع فريق الدعم لمراجعة حالته.",
    loading: "يرجى الانتظار…",
    googleSignUp: "إنشاء حساب سريع عبر Google",
    googleSignIn: "المتابعة عبر Google",
    or: "أو عبر البريد الإلكتروني",
    patientTitle: "أنا مراجع / مريضة",
    patientDescription: "أبحث عن رعاية تجميلية راقية واستشارات مرئية ومتابعة موثوقة من نخبة الأطباء.",
    doctorTitle: "أنا طبيب / جراح تجميل",
    doctorDescription: "أقدّم خدمات ورعاية تجميلية متخصصة وأرغب في الانضمام بعد اعتماد وتوثيق تراخيصي المهنية.",
    providerReviewNote: "نراجع التراخيص والمؤهلات الطبية بعناية فائقة لضمان أعلى معايير الجودة والأمان لجميع المراجعين.",
    doctorAccount: "حساب طبيب",
    patientAccount: "حساب مريض",
    changeType: "· تغيير نوع الحساب",
    doctorNextPrefix: "بعد إنشاء الحساب ستنتقل مباشرة لتقديم",
    doctorApplication: "طلب اعتماد وتوثيق الطبيب",
    doctorNextSuffix: "(الترخيص، التخصص، وسنوات الخبرة) لمراجعته من فريق الامتثال الطبي.",
    forgotPassword: "نسيتِ كلمة المرور؟",
    phone: "رقم الجوال",
    country: "دولة الإقامة",
    chooseCountry: "اختر الدولة",
    city: "المدينة",
    optional: "(اختياري)",
    agreePrefix: "أوافق على",
    terms: "الشروط والأحكام",
    and: "و",
    privacy: "سياسة الخصوصية",
    medicalDisclaimer:
      "، وأفهم أن المنصة تسهّل التواصل مع مقدّمي الخدمة ولا تستبدل الاستشارة الطبية.",
    rememberMe: "تذكّرني على هذا الجهاز",
    createDoctorAccount: "إنشاء الحساب ومتابعة طلب الاعتماد",
    genericError: "تعذّر إتمام العملية. حاول مرة أخرى.",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    shortPassword: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    emailExists: "هذا البريد الإلكتروني مسجّل بالفعل.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
    invalidOrigin: "تعذّر التحقق من الجلسة. حدّث الصفحة وحاول مرة أخرى.",
    rateLimited: "عدد المحاولات كبير. انتظر قليلًا ثم حاول مرة أخرى.",
    invalidPhone: "تحقّق من رقم الجوال وأعد المحاولة.",
    invalidCountry: "اختر دولة الإقامة للمتابعة.",
  },
  en: {
    googleError: "Google sign-in could not be completed. Please try again.",
    termsRequired: "Accept the Terms and Privacy Policy to continue.",
    accountCreatedSignIn: "Your account was created. Sign in to complete your details.",
    chooseAccountType: "Choose an account type to personalize your experience",
    accountDisabled: "This account is disabled. Contact support to review its status.",
    loading: "Please wait…",
    googleSignUp: "Create an account with Google",
    googleSignIn: "Continue with Google",
    or: "or",
    patientTitle: "I am a patient",
    patientDescription:
      "I am exploring aesthetic care and want trusted consultation and follow-up in one place.",
    doctorTitle: "I am a doctor",
    doctorDescription: "I provide aesthetic care and want to join after license verification.",
    providerReviewNote:
      "Providers become visible to patients after their profile and license are reviewed.",
    doctorAccount: "Doctor account",
    patientAccount: "Patient account",
    changeType: "· change type",
    doctorNextPrefix: "After creating your account, you will continue to the",
    doctorApplication: "doctor accreditation application",
    doctorNextSuffix: "with your license, specialty, and experience for compliance review.",
    forgotPassword: "Forgot password?",
    phone: "Mobile number",
    country: "Country of residence",
    chooseCountry: "Choose a country",
    city: "City",
    optional: "(optional)",
    agreePrefix: "I agree to the",
    terms: "Terms and Conditions",
    and: "and",
    privacy: "Privacy Policy",
    medicalDisclaimer:
      ", and understand that Med Aura facilitates contact with providers and does not replace medical advice.",
    rememberMe: "Remember me on this device",
    createDoctorAccount: "Create account and continue accreditation",
    genericError: "We couldn't complete that request. Please try again.",
    invalidCredentials: "The email or password is incorrect.",
    shortPassword: "Your password must be at least 8 characters.",
    emailExists: "An account already exists for this email.",
    invalidEmail: "Enter a valid email address.",
    invalidOrigin: "We couldn't verify this session. Refresh the page and try again.",
    rateLimited: "Too many attempts. Wait a moment and try again.",
    invalidPhone: "Check your mobile number and try again.",
    invalidCountry: "Choose your country of residence to continue.",
  },
} as const

function translateAuthError(message: string | undefined, locale: Locale): string {
  const copy = AUTH_COPY[locale]
  if (!message) return copy.genericError
  const m = message.toLowerCase()
  if (m.includes("invalid") && m.includes("password")) return copy.invalidCredentials
  if (m.includes("password") && (m.includes("short") || m.includes("length") || m.includes("8")))
    return copy.shortPassword
  if (m.includes("credential")) return copy.invalidCredentials
  if (m.includes("exist") || m.includes("already")) return copy.emailExists
  if (m.includes("email")) return copy.invalidEmail
  if (m.includes("origin") || m.includes("csrf") || m.includes("cors")) return copy.invalidOrigin
  if (m.includes("rate")) return copy.rateLimited
  return copy.genericError
}

function translateProfileError(message: string, locale: Locale): string {
  if (locale === "ar") return message
  if (message.includes("الهاتف") || message.includes("الجوال")) return AUTH_COPY.en.invalidPhone
  if (message.includes("الدولة")) return AUTH_COPY.en.invalidCountry
  return AUTH_COPY.en.genericError
}
