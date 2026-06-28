import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { AuthForm } from "@/components/auth/auth-form"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const session = await getSession()
  const { next } = await searchParams
  if (session?.user) redirect(next || "/dashboard")
  const { t } = await getI18n()
  return <AuthForm mode="sign-in" dict={t.auth} nextPath={next} />
}
