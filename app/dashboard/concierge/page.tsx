import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listAllCasesForConcierge, listInternalTasks, listAssignableUsers } from "@/lib/data/concierge"
import { ConciergeBoard } from "@/components/concierge/concierge-board"
import { ConciergeCaseTable } from "@/components/concierge/concierge-case-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

export default async function ConciergeDashboardPage() {
  await requirePermissionPage(PERMISSIONS.CONCIERGE_ACCESS)

  const [tasks, cases, assignableUsers] = await Promise.all([
    listInternalTasks(),
    listAllCasesForConcierge(),
    listAssignableUsers(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">لوحة المتابعة (Concierge)</h1>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="cases">كل الحالات ({cases.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <ConciergeBoard tasks={tasks} assignableUsers={assignableUsers} />
        </TabsContent>
        <TabsContent value="cases" className="mt-4">
          <ConciergeCaseTable cases={cases} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
