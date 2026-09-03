import Link from "next/link"
import { MessageCircle, SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listContactMessagesForAdmin, type ContactMessageListFilters } from "@/lib/data/admin-support"
import { isEmailConfigured } from "@/lib/env"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ContactMessageTable } from "@/components/admin/contact-message-table"
import { AdminPagination } from "@/components/admin/pagination"
import { PageHeader } from "@/components/dashboard/page-header"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "رسائل التواصل" }

const STATUSES = [
  { value: "new", label: "جديدة" },
  { value: "read", label: "مقروءة" },
  { value: "archived", label: "مؤرشفة" },
]

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.SUPPORT_MANAGE)
  const sp = await searchParams

  const filters: ContactMessageListFilters = {
    q: firstParam(sp.q),
    status: firstParam(sp.status),
  }
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const { rows, totalCount, totalPages, newCount } = await listContactMessagesForAdmin(filters, page)

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/messages?${q.toString()}`
  }

  const activeFilterCount = [filters.q, filters.status].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التواصل"
        title="رسائل التواصل"
        description={`${totalCount.toLocaleString("ar-SA-u-nu-latn")} رسالة${newCount > 0 ? ` — ${newCount.toLocaleString("ar-SA-u-nu-latn")} جديدة` : ""} — اضغط أي رسالة لعرضها والرد عليها`}
        stats={
          totalCount > 0
            ? [{ label: "غير مقروءة", value: newCount.toLocaleString("ar-SA-u-nu-latn") }]
            : undefined
        }
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
            <Link href="/admin/messages" className="text-xs font-medium text-primary hover:underline">
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="الاسم، البريد، الموضوع…" />
          </Field>
          <Field label="الحالة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/messages">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={MessageCircle}
              title={activeFilterCount > 0 ? "لا توجد رسائل مطابقة" : "لا توجد رسائل بعد"}
              description={
                activeFilterCount > 0
                  ? "جرّب تعديل الفلاتر أو كلمات البحث."
                  : "ستظهر هنا رسائل نموذج التواصل بمجرد إرسالها."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <ContactMessageTable rows={rows} emailConfigured={isEmailConfigured()} />
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
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
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
