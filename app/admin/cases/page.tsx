import Link from "next/link"
import { FileHeart, ChevronLeft, SlidersHorizontal } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCasesForAdmin, listCaseFilterOptions, type CaseListFilters } from "@/lib/data/admin-cases"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { AdminPagination } from "@/components/admin/pagination"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  caseStatusAr,
  invoiceStatusAr,
  safetyAlertSeverityAr,
} from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "الحالات الطبية" }

const CASE_STATUSES = [
  "DRAFT", "SUBMITTED", "MATCHING", "SHARED_WITH_PROVIDER", "UNDER_REVIEW",
  "MORE_INFORMATION_REQUIRED", "CONSULTATION_REQUIRED", "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED", "TREATMENT_PLAN_ISSUED", "QUOTE_ISSUED",
  "PATIENT_REVIEWING", "QUOTE_ACCEPTED", "DEPOSIT_PAID", "MEDICALLY_APPROVED",
  "CENTER_CONFIRMED", "FULLY_PAID", "PROCEDURE_CONFIRMED", "PROCEDURE_COMPLETED",
  "FOLLOW_UP", "CLOSED", "CANCELLED",
] as const

const PAYMENT_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"] as const
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

function caseStatusTone(status: string): StatusTone {
  if (["CLOSED"].includes(status)) return "neutral"
  if (["CANCELLED"].includes(status)) return "danger"
  if (["MORE_INFORMATION_REQUIRED"].includes(status)) return "warning"
  if (["FULLY_PAID", "PROCEDURE_COMPLETED", "FOLLOW_UP"].includes(status)) return "success"
  return "info"
}

function severityTone(sev: string | null): StatusTone {
  if (sev === "CRITICAL" || sev === "HIGH") return "danger"
  if (sev === "MEDIUM") return "warning"
  return "neutral"
}

function paymentTone(status: string | null): StatusTone {
  if (status === "PAID") return "success"
  if (status === "OVERDUE") return "danger"
  if (status === "PARTIALLY_PAID" || status === "ISSUED") return "warning"
  return "neutral"
}

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.CASE_READ_ANY)
  const sp = await searchParams

  const filters: CaseListFilters = {
    q: str(sp.q),
    status: str(sp.status),
    doctorId: str(sp.doctorId),
    centerId: str(sp.centerId),
    procedureId: str(sp.procedureId),
    country: str(sp.country),
    paymentStatus: str(sp.paymentStatus),
    severity: str(sp.severity),
    from: str(sp.from),
    to: str(sp.to),
    sort: (str(sp.sort) as CaseListFilters["sort"]) ?? "newest",
  }
  const page = Math.max(1, Number(str(sp.page) ?? "1") || 1)

  const [{ rows, totalCount, totalPages }, options] = await Promise.all([
    listCasesForAdmin(filters, page),
    listCaseFilterOptions(),
  ])

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/cases?${q.toString()}`
  }

  const activeFilterCount = [
    filters.q,
    filters.status,
    filters.doctorId,
    filters.centerId,
    filters.procedureId,
    filters.country,
    filters.paymentStatus,
    filters.severity,
    filters.from,
    filters.to,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الرعاية"
        title="الحالات الطبية"
        description={`${totalCount.toLocaleString("ar-SA-u-nu-latn")} حالة إجمالًا${activeFilterCount > 0 ? ` — ${activeFilterCount} فلتر مطبَّق` : ""}`}
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-bold text-foreground">
              عوامل التصفية
            </h2>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Link
              href="/admin/cases"
              className="text-xs font-medium text-primary hover:underline"
            >
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="مرجع، اسم مريض، اسم طبيب…" />
          </Field>
          <Field label="المرحلة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{caseStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="الطبيب">
            <Select name="doctorId" defaultValue={filters.doctorId ?? ""}>
              <option value="">الكل</option>
              {options.doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="المركز">
            <Select name="centerId" defaultValue={filters.centerId ?? ""}>
              <option value="">الكل</option>
              {options.centers.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="الإجراء">
            <Select name="procedureId" defaultValue={filters.procedureId ?? ""}>
              <option value="">الكل</option>
              {options.procedures.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="الدولة">
            <Select name="country" defaultValue={filters.country ?? ""}>
              <option value="">الكل</option>
              {options.countries.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="حالة الدفع">
            <Select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
              <option value="">الكل</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{invoiceStatusAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="مستوى الخطورة">
            <Select name="severity" defaultValue={filters.severity ?? ""}>
              <option value="">الكل</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{safetyAlertSeverityAr(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="من تاريخ">
            <Input type="date" name="from" defaultValue={filters.from ?? ""} />
          </Field>
          <Field label="إلى تاريخ">
            <Input type="date" name="to" defaultValue={filters.to ?? ""} />
          </Field>
          <Field label="الترتيب">
            <Select name="sort" defaultValue={filters.sort ?? "newest"}>
              <option value="newest">الأحدث إنشاءً</option>
              <option value="oldest">الأقدم إنشاءً</option>
              <option value="updated">آخر تحديث</option>
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/cases">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={FileHeart}
              title="لا توجد حالات مطابقة"
              description="جرّب تعديل الفلاتر أو البحث بمرجع أو اسم مختلف."
              tone="muted"
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                    <Th>الحالة</Th>
                    <Th>المريض</Th>
                    <Th>الإجراء</Th>
                    <Th>الطبيب</Th>
                    <Th>المركز</Th>
                    <Th>المرحلة</Th>
                    <Th>الخطورة</Th>
                    <Th>الدفع</Th>
                    <Th>آخر تحديث</Th>
                    <Th>—</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((r) => {
                    const patientInitial = r.patientName.trim().charAt(0) || "؟"
                    return (
                      <tr
                        key={r.id}
                        className="transition-colors hover:bg-muted/25"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/cases/${r.id}`}
                            dir="ltr"
                            className="font-mono text-[11px] font-medium text-primary hover:underline"
                          >
                            {r.reference}
                          </Link>
                          {r.country && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {r.country}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/15">
                              {patientInitial}
                            </span>
                            <span className="font-medium text-foreground">
                              {r.patientName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.procedureName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.doctorName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.centerName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            tone={caseStatusTone(r.status)}
                            label={caseStatusAr(r.status)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {r.severity ? (
                            <StatusBadge
                              tone={severityTone(r.severity)}
                              label={safetyAlertSeverityAr(r.severity)}
                            />
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.paymentStatus ? (
                            <StatusBadge
                              tone={paymentTone(r.paymentStatus)}
                              label={invoiceStatusAr(r.paymentStatus)}
                            />
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                          {new Date(r.updatedAt).toLocaleDateString("ar-SA-u-nu-latn")}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/cases/${r.id}`}
                            className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            فتح
                            <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
