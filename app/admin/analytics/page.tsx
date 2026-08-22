import { BarChart3, CalendarPlus, Eye, Search, UserPlus } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { getAnalyticsOverview } from "@/lib/data/admin-analytics"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricTile } from "@/components/admin/metric-tile"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"
export const metadata = { title: "تحليلات المنتج" }

export default async function AdminAnalyticsPage() {
  await requirePermissionPage(PERMISSIONS.AUDIT_READ)
  const data = await getAnalyticsOverview(30)
  const count = (name: string) => data.counts.get(name) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="القياس"
        title="تحليلات المنتج"
        description="حركة الاستخدام ومسار التحويل خلال آخر 30 يومًا، دون تخزين محتوى طبي أو بيانات تواصل."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile icon={Eye} label="زوار فريدون" value={data.visitors} />
        <MetricTile icon={BarChart3} label="مشاهدات الصفحات" value={count("page_view")} />
        <MetricTile icon={Search} label="عمليات البحث" value={count("search_submitted")} />
        <MetricTile icon={UserPlus} label="حسابات مكتملة" value={count("signup_completed")} />
        <MetricTile icon={CalendarPlus} label="حجوزات منشأة" value={count("booking_created")} />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="font-heading text-sm font-bold">أكثر الصفحات زيارة</h2>
        </div>
        {data.topPages.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            ستظهر البيانات بعد وصول أول زيارات مسجلة.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.topPages.map((row) => (
              <li key={row.path} className="flex items-center justify-between px-5 py-3 text-sm">
                <span dir="ltr" className="font-mono text-xs text-foreground">{row.path}</span>
                <span className="tabular-nums text-muted-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
