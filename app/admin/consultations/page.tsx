import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, hasPermission, hasRole, ROLES } from "@/lib/rbac"
import { listAppointmentsForAdmin, type ConsultationListFilters } from "@/lib/data/appointments"
import { listCaseFilterOptions } from "@/lib/data/admin-cases"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminPagination } from "@/components/admin/pagination"
import { CalendarClock } from "lucide-react"
import { ConsultationTable } from "@/components/admin/consultation-table"
import { appointmentStatusAr, paymentStatusAr } from "@/lib/status-labels"
import { firstParam } from "@/lib/utils"
import { canMarkAppointmentNoShow } from "@/lib/domain/appointment-state"

export const dynamic = "force-dynamic"
export const metadata = { title: "طلبات الاستشارة" }

const STATUSES = [
  "PENDING_PAYMENT", "PENDING_PROVIDER_CONFIRMATION", "CONFIRMED", "CHECKED_IN",
  "IN_PROGRESS", "COMPLETED", "RESCHEDULED", "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_PROVIDER", "NO_SHOW",
] as const
const PAYMENT_STATUSES = [
  "CREATED", "PENDING", "REQUIRES_ACTION", "AUTHORIZED", "PAID", "FAILED",
  "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED",
] as const

export default async function AdminConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await requirePermissionPage(PERMISSIONS.APPOINTMENT_READ_ANY)
  const sp = await searchParams

  const filters: ConsultationListFilters = {
    q: firstParam(sp.q),
    status: firstParam(sp.status),
    paymentStatus: firstParam(sp.paymentStatus),
    doctorId: firstParam(sp.doctorId),
    from: firstParam(sp.from),
    to: firstParam(sp.to),
  }
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const [
    { rows, totalCount, totalPages },
    { doctors },
    canRecordManualPayment,
    canManageAppointments,
    isSuperAdmin,
  ] =
    await Promise.all([
      listAppointmentsForAdmin(filters, page),
      listCaseFilterOptions(),
      hasPermission(viewer.id, PERMISSIONS.FINANCE_ACCESS),
      hasPermission(viewer.id, PERMISSIONS.APPOINTMENT_CONFIRM),
      hasRole(viewer.id, ROLES.SUPER_ADMIN),
    ])

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/consultations?${q.toString()}`
  }

  const activeFilterCount = [
    filters.q,
    filters.status,
    filters.paymentStatus,
    filters.doctorId,
    filters.from,
    filters.to,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">طلبات الاستشارة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount.toLocaleString("ar-SA-u-nu-latn")} موعد استشارة/إجراء
          {activeFilterCount > 0 ? ` — ${activeFilterCount} فلتر مطبَّق` : ""} — اضغط أي صف لعرض التفاصيل
        </p>
      </div>

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
            <Link href="/admin/consultations" className="text-xs font-medium text-primary hover:underline">
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="مرجع، اسم مريض، اسم طبيب…" />
          </Field>
          <Field label="حالة الموعد">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{appointmentStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="حالة الدفع">
            <Select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
              <option value="">الكل</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{paymentStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="الطبيب">
            <Select name="doctorId" defaultValue={filters.doctorId ?? ""}>
              <option value="">الكل</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="من تاريخ">
            <Input type="date" name="from" defaultValue={filters.from ?? ""} />
          </Field>
          <Field label="إلى تاريخ">
            <Input type="date" name="to" defaultValue={filters.to ?? ""} />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
            <Button type="submit">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/consultations">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="لا توجد مواعيد مطابقة"
            description="جرّب تعديل الفلاتر أو البحث بمرجع أو اسم مختلف."
          />
        ) : (
          <>
            <ConsultationTable
              rows={rows.map((row) => ({
                ...row,
                canMarkNoShow:
                  canManageAppointments &&
                  canMarkAppointmentNoShow({
                    status: row.status,
                    endsAt: row.endsAt,
                  }),
              }))}
              canRecordManualPayment={canRecordManualPayment}
              isSuperAdmin={isSuperAdmin}
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
