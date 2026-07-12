import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { AuthForm } from "@/components/auth/auth-form"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; type?: string }>
}) {
  // Gated getCurrentUser(), not the raw session — see sign-in/page.tsx for
  // why (a disabled account's raw session is still "valid" and would bounce
  // between here and /dashboard forever).
  const user = await getCurrentUser()
  const { next, type } = await searchParams
  if (user) redirect(next || "/dashboard")
  const { t } = await getI18n()
  const initialType =
    type === "doctor" || type === "patient" ? type : undefined
  return (
    <AuthForm
      mode="sign-up"
      dict={t.auth}
      home={t.home}
      authShell={t.authShell}
      nextPath={next}
      initialType={initialType}
    />
  )
}
