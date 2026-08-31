import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { doctorProfile, user as userTable } from "@/lib/db/schema"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { getI18n } from "@/lib/i18n"
import { listDoctorProcedureOptions } from "@/lib/data/admin-directory"
import { getMyReviewsAction } from "@/lib/actions/review"
import { getPublicUrl } from "@/lib/storage/r2"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  PracticeSettingsForm,
  type PracticeInitialData,
} from "@/components/dashboard/practice-settings-form"
import { DoctorReviewsSection } from "@/components/dashboard/doctor-reviews-section"

export const dynamic = "force-dynamic"
export const metadata = { title: "ملفي المهني" }

export default async function DoctorPracticePage() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  if (!roles.includes(ROLES.DOCTOR)) redirect("/dashboard")

  const { locale } = await getI18n()
  const isAr = locale === "ar"

  const dp = (
    await db
      .select({
        id: doctorProfile.id,
        bio: doctorProfile.bio,
        qualifications: doctorProfile.qualifications,
        certifications: doctorProfile.certifications,
        fellowships: doctorProfile.fellowships,
        memberships: doctorProfile.memberships,
        consultationFee: doctorProfile.consultationFee,
        currency: doctorProfile.currency,
        offersVideo: doctorProfile.offersVideo,
        offersInPerson: doctorProfile.offersInPerson,
        timezone: doctorProfile.timezone,
        photoKey: doctorProfile.photoKey,
        published: doctorProfile.published,
        status: doctorProfile.status,
      })
      .from(doctorProfile)
      .where(eq(doctorProfile.userId, user.id))
      .limit(1)
  )[0]
  if (!dp) redirect("/dashboard")

  const [procedures, myReviews] = await Promise.all([
    listDoctorProcedureOptions(dp.id),
    getMyReviewsAction(),
  ])

  const initial: PracticeInitialData = {
    bio: dp.bio,
    qualifications: dp.qualifications,
    certifications: dp.certifications,
    fellowships: dp.fellowships,
    memberships: dp.memberships,
    consultationFee: dp.consultationFee,
    currency: dp.currency,
    offersVideo: dp.offersVideo,
    offersInPerson: dp.offersInPerson,
    timezone: dp.timezone,
    photoUrl: getPublicUrl(dp.photoKey ?? ""),
    published: dp.published,
    status: dp.status,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isAr ? "لوحة الطبيب" : "Doctor workspace"}
        title={isAr ? "ملفي المهني" : "My professional profile"}
        description={
          isAr
            ? "صورتك، نبذتك، مؤهلاتك، سعر الاستشارة، والإجراءات التي تقدّمها — نفس البيانات التي يراها المرضى."
            : "Your photo, bio, qualifications, consultation price, and the procedures you offer — the same details patients see."
        }
      />
      <PracticeSettingsForm initial={initial} procedures={procedures} locale={locale} />
      <DoctorReviewsSection reviews={myReviews.status === "ok" ? myReviews.reviews : []} locale={locale} />
    </div>
  )
}
