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
}: {
  mode: "sign-in" | "sign-up"
  dict: AuthDict
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
  nextPath?: string
  accountDisabled?: boolean
  /** Preselects the account type (e.g. /sign-up?type=doctor) and skips the choice step. */
  initialType?: AccountType
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Survives a failed profile save so retrying doesn't hit "email exists".
  const [accountCreated, setAccountCreated] = useState(false)

  const isSignUp = mode === "sign-up"
  const destination = nextPath || "/dashboard"

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
    setLoading(false)
    if (!profile.ok) {
      setError(profile.error)
      return
    }
    router.push(nextPath || profile.next)
    router.refresh()
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
