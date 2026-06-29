import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata = { title: "تعيين كلمة مرور جديدة" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token } = await searchParams
  return <ResetPasswordForm token={token ?? null} />
}
