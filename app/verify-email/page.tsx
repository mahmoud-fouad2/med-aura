import { getCurrentUser } from "@/lib/session"
import { VerifyEmailNotice } from "@/components/auth/verify-email-notice"

export const dynamic = "force-dynamic"
export const metadata = { title: "تفعيل البريد الإلكتروني" }

export default async function VerifyEmailPage() {
  const user = await getCurrentUser()
  return <VerifyEmailNotice defaultEmail={user?.email} />
}
