import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile } from "@/lib/db/schema"
import { requireAuthPage } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { PageHeader } from "@/components/dashboard/page-header"
import { ProfileSettingsForm, type OwnProfileData } from "@/components/dashboard/profile-settings-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "ملفي الشخصي" }

export default async function ProfilePage() {
  const user = await requireAuthPage("/dashboard/profile")
  const { locale } = await getI18n()
  const isAr = locale === "ar"

  const row = (
    await db
      .select({
        phone: patientProfile.phone,
        residenceCountry: patientProfile.residenceCountry,
        city: patientProfile.city,
        dateOfBirth: patientProfile.dateOfBirth,
        nationality: patientProfile.nationality,
        biologicalSex: patientProfile.biologicalSex,
        heightCm: patientProfile.heightCm,
        weightKg: patientProfile.weightKg,
        emergencyContactName: patientProfile.emergencyContactName,
        emergencyContactPhone: patientProfile.emergencyContactPhone,
      })
      .from(patientProfile)
      .where(eq(patientProfile.userId, user.id))
      .limit(1)
  )[0]

  const initial: OwnProfileData = {
    phone: row?.phone ?? null,
    residenceCountry: row?.residenceCountry ?? null,
    city: row?.city ?? null,
    dateOfBirth: row?.dateOfBirth ?? null,
    nationality: row?.nationality ?? null,
    biologicalSex: (row?.biologicalSex as "male" | "female" | null) ?? null,
    heightCm: row?.heightCm ?? null,
    weightKg: row?.weightKg ?? null,
    emergencyContactName: row?.emergencyContactName ?? null,
    emergencyContactPhone: row?.emergencyContactPhone ?? null,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isAr ? "حسابك" : "Your account"}
        title={isAr ? "ملفي الشخصي" : "My profile"}
        description={
          isAr
            ? "بياناتك الشخصية ومعلوماتك الأساسية — تساعد طبيبك على تقديم استشارة أدق."
            : "Your personal details — helps your doctor give a more accurate consultation."
        }
      />
      <ProfileSettingsForm initial={initial} locale={locale} />
    </div>
  )
}
