import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { BroadcastForm } from "@/components/admin/broadcast-form"
import { PageHeader } from "@/components/dashboard/page-header"

export const dynamic = "force-dynamic"
export const metadata = { title: "إشعار جماعي" }

export default async function AdminBroadcastPage() {
  await requirePermissionPage(PERMISSIONS.NOTIFICATIONS_BROADCAST)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التواصل"
        title="إشعار جماعي"
        description="أرسل إشعارًا داخل التطبيق وإشعار push فوري لكل الأعضاء أو فئة منهم — للعروض والإعلانات المهمة فقط."
      />
      <BroadcastForm />
    </div>
  )
}
