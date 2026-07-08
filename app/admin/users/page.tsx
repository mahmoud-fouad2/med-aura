import { UserCog, Search } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, ROLES, hasPermission } from "@/lib/rbac"
import { listUsersForAdmin, listRolesForAdmin } from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/admin/status-badge"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { UserRoleManager } from "@/components/admin/user-role-manager"
import { UserAccountMenu } from "@/components/admin/user-account-menu"
import { nf } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "المستخدمون والصلاحيات" }

const ROLE_LABEL: Record<string, string> = {
  patient: "مريض", doctor: "طبيب", center_owner: "مالك مركز", center_admin: "مدير مركز",
  center_staff: "طاقم مركز", concierge: "فريق المتابعة", compliance_reviewer: "مراجع اعتماد",
  finance_admin: "مالية", support_agent: "دعم", content_admin: "محتوى", super_admin: "مدير النظام",
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const viewer = await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const { q } = await searchParams

  const [users, allRoles, canAssign] = await Promise.all([
    listUsersForAdmin({ q }),
    listRolesForAdmin(),
    hasPermission(viewer.id, PERMISSIONS.ROLE_ASSIGN),
  ])

  const staffCount = users.filter(
    (u) => u.primaryRole !== ROLES.PATIENT || u.roles.some((r) => r.key !== ROLES.PATIENT),
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحسابات"
        title="المستخدمون والصلاحيات"
        description="كل حسابات المنصة في مكان واحد — ابحث، راجع الأدوار، وامنح أو أزل الصلاحيات بأمان مع تسجيل كل تغيير."
        stats={
          users.length > 0
            ? [
                { label: "النتائج", value: nf(users.length) },
                { label: "بأدوار تشغيلية", value: nf(staffCount) },
                { label: "الأدوار المتاحة", value: nf(allRoles.length) },
              ]
            : undefined
        }
      />

      <form method="get" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="ابحث بالاسم أو البريد الإلكتروني…"
            className="ps-9"
            aria-label="بحث في المستخدمين"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          بحث
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {users.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={UserCog}
              title={q ? "لا نتائج مطابقة" : "لا يوجد مستخدمون"}
              description={
                q
                  ? `لم نعثر على مستخدم يطابق «${q}». جرّب اسمًا أو بريدًا آخر.`
                  : "ستظهر هنا حسابات المستخدمين فور تسجيلها."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 p-3 sm:hidden">
              {users.map((u) => (
                <MobileDataCard
                  key={u.id}
                  title={
                    <span className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">
                        {u.name.trim().charAt(0) || "؟"}
                      </span>
                      <span className="truncate">{u.name}</span>
                    </span>
                  }
                  subtitle={
                    <span dir="ltr" className="inline-block truncate">
                      {u.email}
                    </span>
                  }
                  badge={
                    <StatusBadge
                      tone={u.status === "active" ? "success" : u.status === "suspended" ? "danger" : "neutral"}
                      label={u.status === "active" ? "نشط" : u.status === "suspended" ? "موقوف" : "معطَّل"}
                    />
                  }
                  rows={[
                    { label: "الدور الأساسي", value: ROLE_LABEL[u.primaryRole] ?? u.primaryRole },
                    {
                      label: "آخر دخول",
                      value: u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short" })
                        : "لم يسجّل دخول بعد",
                    },
                  ]}
                  actions={
                    canAssign ? (
                      <>
                        <UserRoleManager
                          userId={u.id}
                          userName={u.name}
                          currentKeys={u.roles.map((r) => r.key)}
                          allRoles={allRoles.map((r) => ({
                            key: r.key,
                            nameAr: ROLE_LABEL[r.key] ?? r.nameAr,
                          }))}
                          selfId={viewer.id}
                        />
                        <UserAccountMenu
                          userId={u.id}
                          userName={u.name}
                          userPhone={u.phone}
                          isActive={u.status === "active"}
                          isSelf={u.id === viewer.id}
                        />
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>المستخدم</Th>
                  <Th>الدور الأساسي</Th>
                  <Th>أدوار إضافية</Th>
                  <Th>الحالة</Th>
                  <Th>آخر دخول</Th>
                  {canAssign && <Th>الأدوار</Th>}
                  {canAssign && <Th>—</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="align-top transition-colors hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-bold text-primary">
                          {u.name.trim().charAt(0) || "؟"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{u.name}</p>
                          <p dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {ROLE_LABEL[u.primaryRole] ?? u.primaryRole}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <Badge key={r.key} variant="outline">
                              {ROLE_LABEL[r.key] ?? r.nameAr}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={u.status === "active" ? "success" : u.status === "suspended" ? "danger" : "neutral"}
                        label={
                          u.status === "active" ? "نشط" : u.status === "suspended" ? "موقوف" : "معطَّل"
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {u.lastLoginAt ? (
                        new Date(u.lastLoginAt).toLocaleDateString("ar-SA-u-nu-latn", {
                          day: "numeric",
                          month: "short",
                        })
                      ) : (
                        <span className="text-muted-foreground/50">لم يسجّل دخول بعد</span>
                      )}
                    </td>
                    {canAssign && (
                      <td className="px-4 py-3">
                        <UserRoleManager
                          userId={u.id}
                          userName={u.name}
                          currentKeys={u.roles.map((r) => r.key)}
                          allRoles={allRoles.map((r) => ({
                            key: r.key,
                            nameAr: ROLE_LABEL[r.key] ?? r.nameAr,
                          }))}
                          selfId={viewer.id}
                        />
                      </td>
                    )}
                    {canAssign && (
                      <td className="px-4 py-3">
                        <UserAccountMenu
                          userId={u.id}
                          userName={u.name}
                          userPhone={u.phone}
                          isActive={u.status === "active"}
                          isSelf={u.id === viewer.id}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-start font-medium tracking-wide">{children}</th>
  )
}
