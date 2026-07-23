import { notFound } from "next/navigation"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { isVideoQaEnabled } from "@/lib/env"
import { PageHeader } from "@/components/dashboard/page-header"
import { VideoQaPanel } from "@/components/admin/video-qa-panel"

export const dynamic = "force-dynamic"
export const metadata = { title: "اختبار الفيديو (QA)" }

/**
 * Hidden entirely — not just gated — when ENABLE_VIDEO_QA_TOOLS isn't set.
 * Same posture as the API routes underneath it: off means it doesn't exist.
 */
export default async function AdminVideoQaPage() {
  if (!isVideoQaEnabled()) notFound()
  await requirePermissionPage(PERMISSIONS.ADMIN_ACCESS)

  const [testPatients, testDoctors] = await Promise.all([
    db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(and(eq(userTable.isTest, true), eq(userTable.role, "patient"))),
    db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(and(eq(userTable.isTest, true), eq(userTable.role, "doctor"))),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="أدوات QA"
        title="جلسة فيديو تجريبية"
        description="غرفة Daily حقيقية بين حساب مريض وحساب طبيب محدَّدين كحسابي اختبار — بلا موعد وبلا دفع. مدتها 30 دقيقة، وتُنظَّف عند الإنهاء."
      />
      <VideoQaPanel testPatients={testPatients} testDoctors={testDoctors} />
    </div>
  )
}
