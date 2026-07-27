import { redirect } from "next/navigation"
import { eq, desc, asc } from "drizzle-orm"
import { AlertTriangle } from "lucide-react"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { db } from "@/lib/db"
import { procedure as procedureT, providerApplication, country } from "@/lib/db/schema"
import { Card } from "@/components/ui/card"
import { DoctorApplicationForm } from "@/components/provider/doctor-application-form"
import type { DoctorApplicationInput } from "@/lib/actions/provider"

export const dynamic = "force-dynamic"

export default async function ApplyPage() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  if (roles.includes(ROLES.DOCTOR)) redirect("/dashboard/doctor")

  const open = (
    await db
      .select({
        status: providerApplication.status,
        notes: providerApplication.reviewerNotes,
        payload: providerApplication.payload,
      })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .orderBy(desc(providerApplication.createdAt))
      .limit(1)
  )[0]

  if (open && (open.status === "SUBMITTED" || open.status === "UNDER_REVIEW")) {
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

  const needsChanges = open?.status === "NEEDS_CHANGES"

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
      {needsChanges && (
        <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              فريق الاعتماد طلب تعديلًا قبل المتابعة
            </p>
            <p className="text-sm text-muted-foreground">
              {open?.notes || "يرجى مراجعة بياناتك وإعادة الإرسال."}
            </p>
          </div>
        </Card>
      )}
      <DoctorApplicationForm
        procedures={procedures}
        countries={countries}
        defaultValues={needsChanges ? (open?.payload as Partial<DoctorApplicationInput>) : undefined}
      />
    </div>
  )
}
