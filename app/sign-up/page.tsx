import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { isGoogleAuthConfigured } from "@/lib/env"
import { AuthForm } from "@/components/auth/auth-form"
import { buildPageMetadata } from "@/lib/seo"
import { safeRelativePath } from "@/lib/navigation"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "إنشاء حساب" : "Create an account",
    description: locale === "ar"
      ? "أنشئ حسابك لبدء استشارة ومتابعة طلباتك على Med Aura."
      : "Create your account to start a consultation and track your requests on Med Aura.",
    path: "/sign-up",
    locale,
    robots: { index: false, follow: false },
  })
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; type?: string; ref?: string }>
}) {
  // Gated getCurrentUser(), not the raw session — see sign-in/page.tsx for
  // why (a disabled account's raw session is still "valid" and would bounce
  // between here and /dashboard forever).
  const user = await getCurrentUser()
  const { next, type, ref } = await searchParams
  if (user) redirect(safeRelativePath(next))
  const { locale, t } = await getI18n()
  const initialType = type === "doctor" || type === "patient" ? type : undefined
  return (
    <AuthForm
      mode="sign-up"
      locale={locale}
      dict={t.auth}
      home={t.home}
      authShell={t.authShell}
      nextPath={next}
      initialType={initialType}
      googleEnabled={isGoogleAuthConfigured()}
      initialReferralCode={ref?.trim().slice(0, 20).toUpperCase()}
    />
  )
}
