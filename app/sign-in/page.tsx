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
    title: locale === "ar" ? "تسجيل الدخول" : "Sign in",
    description: locale === "ar"
      ? "سجّل الدخول لمتابعة استشاراتك ومواعيدك على Med Aura."
      : "Sign in to manage your Med Aura consultations and appointments.",
    path: "/sign-in",
    locale,
    robots: { index: false, follow: false },
  })
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; disabled?: string; googleError?: string }>
}) {
  // Gated getCurrentUser() (not the raw Better Auth session) — a disabled
  // account's underlying session is still technically valid, so checking the
  // raw session here would bounce them straight back to /dashboard, which
  // itself bounces them back here: an infinite redirect loop.
  const user = await getCurrentUser()
  const { next, disabled, googleError } = await searchParams
  if (user) redirect(safeRelativePath(next))
  const { locale, t } = await getI18n()
  return (
    <AuthForm
      mode="sign-in"
      locale={locale}
      dict={t.auth}
      home={t.home}
      authShell={t.authShell}
      nextPath={next}
      accountDisabled={disabled === "1"}
      googleEnabled={isGoogleAuthConfigured()}
      googleError={googleError === "1"}
    />
  )
}
