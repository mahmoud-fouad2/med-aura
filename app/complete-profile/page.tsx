import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile } from "@/lib/db/schema"
import { requireAuthPage } from "@/lib/session"
import { CompleteProfileForm } from "@/components/auth/complete-profile-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getI18n } from "@/lib/i18n"

export const metadata = { title: "أكمل بياناتك" }

/**
 * Landing spot for a first-time Google sign-up (see AuthForm's
 * newUserCallbackURL). Google never collects a phone number or country, so
 * this fills the same two fields the email/password flow gets synchronously
 * right after signUp.email() — via the exact same completeSignupProfile
 * action, just triggered a step later.
 */
export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const destination = next || "/dashboard"
  const user = await requireAuthPage(`/complete-profile?next=${encodeURIComponent(destination)}`)

  const existing = (
    await db
      .select({ onboardingCompleted: patientProfile.onboardingCompleted })
      .from(patientProfile)
      .where(eq(patientProfile.userId, user.id))
      .limit(1)
  )[0]
  // Already onboarded (a returning Google user, or profile completed some
  // other way) — nothing to collect, go straight through.
  if (existing?.onboardingCompleted) redirect(destination)

  const { t } = await getI18n()

  return (
    <AuthShell home={t.home} authShell={t.authShell}>
      <CompleteProfileForm destination={destination} />
    </AuthShell>
  )
}
