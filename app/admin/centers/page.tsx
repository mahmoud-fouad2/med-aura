import Link from "next/link"
import { Building2, SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCentersForAdmin, type AdminCenterListFilters } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { CenterTable } from "@/components/admin/center-table"
import { AdminPagination } from "@/components/admin/pagination"
import { PageHeader } from "@/components/dashboard/page-header"
import { countryNameAr, providerStatusAr, PROVIDER_STATUSES, COUNTRY_CODES } from "@/lib/status-labels"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "المراكز" }

export default async function AdminCentersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const sp = await searchParams

  const filters: AdminCenterListFilters = {
    q: firstParam(sp.q),
    status: firstParam(sp.status),
    country: firstParam(sp.country),
  }
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const { rows, totalCount, totalPages } = await listCentersForAdmin(filters, page)

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/centers?${q.toString()}`
  }

  const activeFilterCount = [filters.q, filters.status, filters.country].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مقدّمو الخدمة"
        title="المراكز"
        description={`${totalCount.toLocaleString("ar-SA-u-nu-latn")} مركز — اضغط أي صف لعرض التفاصيل والتعديل`}
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
            <Link href="/admin/centers" className="text-xs font-medium text-primary hover:underline">
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="ابحث باسم المركز…" />
          </Field>
          <Field label="الحالة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {PROVIDER_STATUSES.map((s) => (
                <option key={s} value={s}>{providerStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="الدولة">
            <Select name="country" defaultValue={filters.country ?? ""}>
              <option value="">الكل</option>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>{countryNameAr(c)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-3">
            <Button type="submit">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/centers">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Building2}
              title={activeFilterCount > 0 ? "لا توجد مراكز مطابقة" : "لا توجد مراكز بعد"}
              description={
                activeFilterCount > 0
                  ? "جرّب تعديل الفلاتر أو كلمات البحث."
                  : "ستظهر المراكز هنا بمجرد الموافقة على طلبات انضمامها."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <CenterTable rows={rows} />
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
