import Link from "next/link"
import { UserCog, SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, hasPermission, ROLES } from "@/lib/rbac"
import { listUsersForAdmin, listRolesForAdmin, type AdminUserListFilters } from "@/lib/data/admin-content"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { UserTable } from "@/components/admin/user-table"
import { AdminPagination } from "@/components/admin/pagination"
import { roleAr } from "@/lib/status-labels"
import { nf } from "@/lib/format"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "المستخدمون والصلاحيات" }

const STATUSES = ["active", "disabled", "suspended"] as const

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const sp = await searchParams

  const filters: AdminUserListFilters = {
    q: firstParam(sp.q),
    role: firstParam(sp.role),
    status: firstParam(sp.status),
  }
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const [{ rows, totalCount, totalPages }, allRoles, canAssign, canViewActivity] = await Promise.all([
    listUsersForAdmin(filters, page),
    listRolesForAdmin(),
    hasPermission(viewer.id, PERMISSIONS.ROLE_ASSIGN),
    hasPermission(viewer.id, PERMISSIONS.AUDIT_READ),
  ])

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/users?${q.toString()}`
  }

  const activeFilterCount = [filters.q, filters.role, filters.status].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الحسابات"
        title="المستخدمون والصلاحيات"
        description="كل حسابات المنصة في مكان واحد — ابحث، راجع الأدوار، وامنح أو أزل الصلاحيات بأمان مع تسجيل كل تغيير."
        stats={[
          { label: "النتائج", value: nf(totalCount) },
          { label: "الأدوار المتاحة", value: nf(allRoles.length) },
        ]}
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-bold text-foreground">عوامل التصفية</h2>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Link href="/admin/users" className="text-xs font-medium text-primary hover:underline">
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="الاسم أو البريد أو الهاتف…" />
          </Field>
          <Field label="الدور">
            <Select name="role" defaultValue={filters.role ?? ""}>
              <option value="">الكل</option>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>{roleAr(r)}</option>
              ))}
            </Select>
          </Field>
          <Field label="الحالة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "active" ? "نشط" : s === "suspended" ? "موقوف" : "معطَّل"}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-3">
            <Button type="submit">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/users">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={UserCog}
              title={activeFilterCount > 0 ? "لا نتائج مطابقة" : "لا يوجد مستخدمون"}
              description={
                activeFilterCount > 0
                  ? "جرّب تعديل الفلاتر أو البحث باسم أو بريد آخر."
                  : "ستظهر هنا حسابات المستخدمين فور تسجيلها."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <UserTable
              rows={rows}
              allRoles={allRoles}
              canAssign={canAssign}
              canViewActivity={canViewActivity}
              selfId={viewer.id}
            />
            <AdminPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={20}
              buildHref={(p) => buildHref({ page: p })}
            />
          </>
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

function Select({
  name,
  defaultValue,
  children,
}: {
  name: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
    >
      {children}
    </select>
  )
}
