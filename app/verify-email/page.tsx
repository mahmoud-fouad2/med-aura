import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { VerifyEmailNotice } from "@/components/auth/verify-email-notice"

export const dynamic = "force-dynamic"
export const metadata = { title: "تفعيل البريد الإلكتروني" }

export default async function VerifyEmailPage() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()])
  return <VerifyEmailNotice defaultEmail={user?.email} home={t.home} authShell={t.authShell} />
}
