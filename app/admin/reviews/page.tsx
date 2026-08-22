import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listPendingReviews } from "@/lib/data/admin-reviews"
import { PageHeader } from "@/components/dashboard/page-header"
import { ReviewModeration } from "@/components/admin/review-moderation"

export const dynamic = "force-dynamic"
export const metadata = { title: "مراجعة التقييمات" }

export default async function AdminReviewsPage() {
  await requirePermissionPage(PERMISSIONS.BEFORE_AFTER_MODERATE)
  const rows = await listPendingReviews()
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الثقة والجودة" title="مراجعة التقييمات" description={`${rows.length.toLocaleString("ar-SA-u-nu-latn")} تقييم نصي بانتظار التحقق من الخصوصية وملاءمة النشر.`} />
      <ReviewModeration rows={rows} />
    </div>
  )
}
