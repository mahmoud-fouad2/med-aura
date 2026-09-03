import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile } from "@/lib/db/schema"
import { requireAuthPage } from "@/lib/session"
import { ProfileWizard } from "@/components/auth/profile-wizard"
import { AuthShell } from "@/components/auth/auth-shell"
import { getI18n } from "@/lib/i18n"
import { safeRelativePath } from "@/lib/navigation"

export const metadata = { title: "أكمل بياناتك" }

/**
 * Two-step onboarding wizard, reached from three places: a first-time Google
 * sign-up (AuthForm's newUserCallbackURL — phone/country never collected, so
 * both steps show), an email/password sign-up that already has phone/country
 * (only the "about yourself" step shows), and /dashboard's own redirect for
 * any patient — new or pre-existing — who has never seen the "about
 * yourself" step (profileWizardSeenAt still null).
 */
export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const destination = safeRelativePath(next)
  const user = await requireAuthPage(`/complete-profile?next=${encodeURIComponent(destination)}`)

  const existing = (
    await db
      .select({
        onboardingCompleted: patientProfile.onboardingCompleted,
        profileWizardSeenAt: patientProfile.profileWizardSeenAt,
      })
      .from(patientProfile)
      .where(eq(patientProfile.userId, user.id))
      .limit(1)
  )[0]
  // Both steps already done — nothing left to collect, go straight through.
  if (existing?.onboardingCompleted && existing?.profileWizardSeenAt) redirect(destination)

  const { locale, t } = await getI18n()
  const startStep = existing?.onboardingCompleted ? "about" : "contact"

  return (
    <AuthShell locale={locale} home={t.home} authShell={t.authShell}>
      <ProfileWizard
        destination={destination}
        startStep={startStep}
        locale={locale}
        defaultPhone={user.phone ?? ""}
        defaultCountry={user.country ?? ""}
      />
    </AuthShell>
  )
}
