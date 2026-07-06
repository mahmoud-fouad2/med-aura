import { UserCog } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listUsersForAdmin } from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "المستخدمون والصلاحيات" }

const ROLE_LABEL: Record<string, string> = {
  patient: "مريض", doctor: "طبيب", center_owner: "مالك مركز", center_admin: "مدير مركز",
  center_staff: "طاقم مركز", concierge: "متابعة", compliance_reviewer: "مراجع اعتماد",
  finance_admin: "مالية", support_agent: "دعم", content_admin: "محتوى", super_admin: "مدير النظام",
}

export default async function AdminUsersPage() {
  await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const users = await listUsersForAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">المستخدمون والصلاحيات</h1>
        <p className="mt-1 text-sm text-muted-foreground">{users.length.toLocaleString("ar-SA-u-nu-latn")} مستخدم</p>
      </div>

      <Card className="overflow-hidden p-0">
        {users.length === 0 ? (
          <EmptyState icon={UserCog} title="لا يوجد مستخدمون" description="ستظهر هنا حسابات المستخدمين." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>البريد الإلكتروني</Th>
                  <Th>الدور الأساسي</Th>
                  <Th>الأدوار الإضافية</Th>
                  <Th>تاريخ التسجيل</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                    <td dir="ltr" className="px-4 py-3 text-end text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{ROLE_LABEL[u.primaryRole] ?? u.primaryRole}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <Badge key={r} variant="outline">{r}</Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
