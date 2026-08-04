import { redirect } from "next/navigation"
import { currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { getMyAvailabilityAction } from "@/lib/actions/doctor"
import { AvailabilityEditor } from "@/components/dashboard/availability-editor"
import { PageHeader } from "@/components/dashboard/page-header"

export const dynamic = "force-dynamic"

export default async function DoctorAvailabilityPage() {
  const roles = await currentUserRoles()
  if (!roles.includes(ROLES.DOCTOR)) redirect("/dashboard")

  const res = await getMyAvailabilityAction()
  const rules = res.status === "ok" ? res.rules : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="لوحة الطبيب"
        title="أوقات التوفر"
        description="حدّد الأيام والأوقات التي يمكن للمرضى فيها حجز استشارة معك — تُبنى مواعيد الحجز المتاحة تلقائيًا من هذه القواعد."
      />
      <AvailabilityEditor initialRules={rules} />
    </div>
  )
}
