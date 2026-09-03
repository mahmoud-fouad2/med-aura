import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { VerifyEmailNotice } from "@/components/auth/verify-email-notice"
import { buildPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"
export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "تفعيل البريد الإلكتروني" : "Verify your email",
    description: locale === "ar"
      ? "فعّل بريدك الإلكتروني للمتابعة إلى حساب Med Aura."
      : "Verify your email address to continue to your Med Aura account.",
    path: "/verify-email",
    locale,
    robots: { index: false, follow: false },
  })
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const [{ email }, user, { locale, t }] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getI18n(),
  ])
  return (
    <VerifyEmailNotice
      defaultEmail={user?.email ?? email}
      locale={locale}
      home={t.home}
      authShell={t.authShell}
    />
  )
}
