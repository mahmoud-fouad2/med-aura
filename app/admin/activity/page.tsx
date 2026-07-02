import { History } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { searchActivity, type ActivityFilter } from "@/lib/data/admin-activity"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

export const dynamic = "force-dynamic"
export const metadata = { title: "سجل النشاط" }

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.AUDIT_READ)
  const sp = await searchParams

  const filter: ActivityFilter = {
    action: str(sp.action),
    actorName: str(sp.actorName),
    from: str(sp.from),
    to: str(sp.to),
  }

  const entries = await searchActivity(filter, 200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">سجل النشاط</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          آخر {entries.length.toLocaleString("ar-SA")} عملية — سجل تدقيق كامل لكل الإجراءات الحساسة على المنصة.
        </p>
      </div>

      <Card className="p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="نوع الإجراء">
            <Input name="action" defaultValue={filter.action ?? ""} placeholder="مثال: case.create" />
          </Field>
          <Field label="اسم المنفّذ">
            <Input name="actorName" defaultValue={filter.actorName ?? ""} />
          </Field>
          <Field label="من تاريخ">
            <Input type="date" name="from" defaultValue={filter.from ?? ""} />
          </Field>
          <Field label="إلى تاريخ">
            <Input type="date" name="to" defaultValue={filter.to ?? ""} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit">تطبيق الفلاتر</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {entries.length === 0 ? (
          <EmptyState icon={History} title="لا يوجد نشاط مطابق" description="جرّب تعديل الفلاتر." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الإجراء</Th>
                  <Th>المنفّذ</Th>
                  <Th>نوع الكيان</Th>
                  <Th>الوقت</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-muted/30">
                    <td dir="ltr" className="px-4 py-3 text-end font-mono text-xs text-foreground">{e.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.actorName ?? "النظام"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.entityType ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString("ar-SA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
