import { KanbanSquare, ClipboardList, Activity, AlertTriangle } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listAllCasesForConcierge,
  listInternalTasks,
  listAssignableUsers,
} from "@/lib/data/concierge"
import { ConciergeBoard } from "@/components/concierge/concierge-board"
import { ConciergeCaseTable } from "@/components/concierge/concierge-case-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"

export const dynamic = "force-dynamic"

export default async function ConciergeDashboardPage() {
  await requirePermissionPage(PERMISSIONS.CONCIERGE_ACCESS)

  const [tasks, cases, assignableUsers] = await Promise.all([
    listInternalTasks(),
    listAllCasesForConcierge(),
    listAssignableUsers(),
  ])

  const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED")
  const overdueTasks = openTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now(),
  )
  const activeCases = cases.filter(
    (c) => c.status !== "CLOSED" && c.status !== "CANCELLED",
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="متابعة تشغيلية"
        title="لوحة Concierge"
        description="تنظيم المهام، متابعة الحالات النشطة، وإدارة الفريق التشغيلي."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ClipboardList}
          label="مهام مفتوحة"
          value={openTasks.length.toLocaleString("ar-SA")}
          hint={openTasks.length === 0 ? "لا مهام معلّقة" : "تحتاج متابعة"}
          tone={openTasks.length > 0 ? "primary" : "success"}
          emphasis
        />
        <MetricCard
          icon={AlertTriangle}
          label="مهام متأخرة"
          value={overdueTasks.length.toLocaleString("ar-SA")}
          hint={
            overdueTasks.length === 0
              ? "كل المهام في وقتها"
              : "تجاوزت الموعد المستحق"
          }
          tone={overdueTasks.length > 0 ? "danger" : "success"}
          emphasis
        />
        <MetricCard
          icon={Activity}
          label="حالات نشطة"
          value={activeCases.length.toLocaleString("ar-SA")}
          hint="في أي مرحلة قبل الإغلاق"
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={KanbanSquare}
          label="إجمالي الحالات"
          value={cases.length.toLocaleString("ar-SA")}
          hint="نشطة ومغلقة"
          tone="neutral"
          emphasis
        />
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="flex-wrap">
          <TabsTrigger value="tasks">المهام ({openTasks.length})</TabsTrigger>
          <TabsTrigger value="cases">كل الحالات ({cases.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <SectionCard
            icon={KanbanSquare}
            title="لوحة المهام"
            description="مهام تشغيلية موزّعة على الفريق. اسحب أو غيّر الحالة لإعادة التوزيع."
          >
            <div className="p-5">
              <ConciergeBoard tasks={tasks} assignableUsers={assignableUsers} />
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="cases" className="mt-4">
          <SectionCard
            icon={Activity}
            title="كل الحالات"
            description="جدول شامل لكل الحالات على المنصة مع فلاتر وتصفية."
          >
            <div className="p-5">
              <ConciergeCaseTable cases={cases} />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
