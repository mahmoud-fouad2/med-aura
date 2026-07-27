import Link from "next/link"
import { Users, Search, X } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, hasPermission } from "@/lib/rbac"
import { listPatientsForAdmin } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { PatientTable } from "@/components/admin/patient-table"
import { AdminPagination } from "@/components/admin/pagination"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "المرضى" }

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const sp = await searchParams
  const q = firstParam(sp.q)
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const [{ rows, totalCount, totalPages }, canManageAccount, canViewActivity] = await Promise.all([
    listPatientsForAdmin(q, page),
    hasPermission(viewer.id, PERMISSIONS.ROLE_ASSIGN),
    hasPermission(viewer.id, PERMISSIONS.AUDIT_READ),
  ])
  const withCases = rows.filter((p) => p.caseCount > 0)

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q2 = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q2.set(k, String(val))
    }
    return `/admin/patients?${q2.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الدليل"
        title="المرضى"
        description={`${totalCount.toLocaleString("ar-SA-u-nu-latn")} مريض مسجَّل${q ? ` مطابق للبحث "${q}"` : ""}`}
        stats={
          totalCount > 0
            ? [
                { label: "الإجمالي", value: totalCount.toLocaleString("ar-SA-u-nu-latn") },
                { label: "لديهم حالات (هذه الصفحة)", value: withCases.length.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="ابحث بالاسم أو البريد الإلكتروني…"
              className="h-9 ps-9"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="size-4" />
            بحث
          </Button>
          {q && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              render={
                <Link href="/admin/patients">
                  <X className="size-4" />
                  إعادة ضبط
                </Link>
              }
            />
          )}
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Users}
              title={q ? "لا يوجد مرضى مطابقون" : "لا يوجد مرضى بعد"}
              description={
                q
                  ? "جرّب تعديل كلمات البحث."
                  : "سيظهر المرضى هنا بمجرد تسجيلهم على المنصة."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <PatientTable rows={rows} canManageAccount={canManageAccount} canViewActivity={canViewActivity} />
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
