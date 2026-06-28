import { redirect } from "next/navigation"
import { eq, desc, asc } from "drizzle-orm"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { db } from "@/lib/db"
import { procedure as procedureT, providerApplication, country } from "@/lib/db/schema"
import { Card } from "@/components/ui/card"
import { DoctorApplicationForm } from "@/components/provider/doctor-application-form"

export const dynamic = "force-dynamic"

export default async function ApplyPage() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  if (roles.includes(ROLES.DOCTOR)) redirect("/dashboard/doctor")

  const open = (
    await db
      .select({ status: providerApplication.status, notes: providerApplication.reviewerNotes })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .orderBy(desc(providerApplication.createdAt))
      .limit(1)
  )[0]

  const openStatuses = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"]
  if (open && openStatuses.includes(open.status)) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <h1 className="font-heading text-xl font-bold text-foreground">
            طلب الانضمام قيد المراجعة
          </h1>
          <p className="mt-2 text-muted-foreground">
            استلمنا طلبك وسيقوم فريق الاعتماد بمراجعته والتحقق من ترخيصك. سنخطرك
            بالنتيجة قريبًا.
          </p>
        </Card>
      </div>
    )
  }

  const [procedures, countries] = await Promise.all([
    db
      .select({ slug: procedureT.slug, nameAr: procedureT.nameAr })
      .from(procedureT)
      .where(eq(procedureT.visible, true))
      .orderBy(asc(procedureT.sortOrder)),
    db
      .select({ code: country.code, nameAr: country.nameAr })
      .from(country)
      .where(eq(country.active, true))
      .orderBy(asc(country.sortOrder)),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          طلب الانضمام كطبيب
        </h1>
        <p className="mt-1 text-muted-foreground">
          أدخل بياناتك المهنية وترخيصك. لن يظهر ملفك للمرضى إلا بعد مراجعة فريق
          الاعتماد والموافقة.
        </p>
      </div>
      <DoctorApplicationForm procedures={procedures} countries={countries} />
    </div>
  )
}
