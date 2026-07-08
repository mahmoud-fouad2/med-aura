import { getI18n } from "@/lib/i18n"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata = { title: "تعيين كلمة مرور جديدة" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const [{ token }, { t }] = await Promise.all([searchParams, getI18n()])
  return <ResetPasswordForm token={token ?? null} home={t.home} authShell={t.authShell} />
}
