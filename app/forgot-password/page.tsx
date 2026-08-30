import { getI18n } from "@/lib/i18n"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = { title: "إعادة تعيين كلمة المرور" }

export default async function ForgotPasswordPage() {
  const { locale, t } = await getI18n()
  return <ForgotPasswordForm locale={locale} home={t.home} authShell={t.authShell} />
}
