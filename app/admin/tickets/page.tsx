import Link from "next/link"
import { LifeBuoy, SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listTicketsForAdmin, TICKET_STATUSES, TICKET_CATEGORIES, type TicketAdminFilters } from "@/lib/data/support-tickets"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminTicketTable } from "@/components/admin/ticket-table"
import { PageHeader } from "@/components/dashboard/page-header"
import { ticketStatusAr, ticketCategoryAr } from "@/lib/status-labels"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "تذاكر الدعم" }

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.SUPPORT_MANAGE)
  const sp = await searchParams

  const filters: TicketAdminFilters = {
    q: firstParam(sp.q),
    status: firstParam(sp.status),
    category: firstParam(sp.category),
  }

  const tickets = await listTicketsForAdmin(filters)
  const openCount = tickets.filter((t) => t.status === "OPEN").length

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const q = new URLSearchParams()
    const merged = { q: filters.q, status: filters.status, category: filters.category, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) q.set(k, v)
    }
    return `/admin/tickets?${q.toString()}`
  }

  const activeFilterCount = [filters.q, filters.status, filters.category].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التواصل"
        title="تذاكر الدعم"
        description={`${tickets.length.toLocaleString("ar-SA-u-nu-latn")} تذكرة — اضغط أي تذكرة لعرضها والرد عليها`}
        stats={tickets.length > 0 ? [{ label: "مفتوحة", value: openCount.toLocaleString("ar-SA-u-nu-latn") }] : undefined}
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-bold text-foreground">عوامل التصفية</h2>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{activeFilterCount}</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Link href="/admin/tickets" className="text-xs font-medium text-primary hover:underline">مسح الكل</Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="العنوان أو اسم المريض…" />
          </Field>
          <Field label="الحالة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>{ticketStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="التصنيف">
            <Select name="category" defaultValue={filters.category ?? ""}>
              <option value="">الكل</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{ticketCategoryAr(c)}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">تطبيق</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/tickets">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {tickets.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={LifeBuoy}
              title={activeFilterCount > 0 ? "لا توجد تذاكر مطابقة" : "لا توجد تذاكر بعد"}
              description={activeFilterCount > 0 ? "جرّب تعديل الفلاتر." : "ستظهر هنا تذاكر الدعم بمجرد فتحها من المستخدمين."}
              tone="muted"
            />
          </div>
        ) : (
          <AdminTicketTable rows={tickets} />
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

function Select({ name, defaultValue, children }: { name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <select name={name} defaultValue={defaultValue} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
      {children}
    </select>
  )
}
