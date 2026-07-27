import Link from "next/link"
import {
  Inbox,
  Stethoscope,
  Building2,
  MapPin,
  Languages,
  Sparkles,
  FileText,
  Calendar,
  SlidersHorizontal,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminPagination } from "@/components/admin/pagination"
import { ApplicationReview } from "@/components/admin/application-review"
import { PageHeader } from "@/components/dashboard/page-header"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { countryNameAr } from "@/lib/status-labels"
import { listApplicationsForAdmin, type ApplicationListFilters } from "@/lib/data/admin-applications"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "طلبات الانضمام" }

type Payload = {
  name?: string
  title?: string
  legalName?: string
  country?: string
  city?: string
  yearsExperience?: number
  languages?: string[]
  procedures?: string[]
  services?: string[]
  license?: {
    number?: string
    issuingAuthority?: string
    expiryDate?: string
    commercialRegistrationLast4?: string
    facilityLicenseNumberLast4?: string
    licenseExpiryDate?: string
  }
}

const STATUS_TONE: Record<
  string,
  { label: string; classes: string; ring: string }
> = {
  SUBMITTED: {
    label: "تم الإرسال",
    classes: "bg-primary/10 text-primary",
    ring: "ring-primary/15",
  },
  UNDER_REVIEW: {
    label: "قيد المراجعة",
    classes: "bg-warning/15 text-warning-foreground",
    ring: "ring-warning/20",
  },
  NEEDS_CHANGES: {
    label: "بحاجة لتعديل",
    classes: "bg-warning/15 text-warning-foreground",
    ring: "ring-warning/20",
  },
  APPROVED: {
    label: "تمت الموافقة",
    classes: "bg-success/10 text-success",
    ring: "ring-success/15",
  },
  REJECTED: {
    label: "مرفوض",
    classes: "bg-destructive/10 text-destructive",
    ring: "ring-destructive/15",
  },
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const sp = await searchParams

  const filters: ApplicationListFilters = {
    q: firstParam(sp.q),
    kind: firstParam(sp.kind),
    status: firstParam(sp.status),
  }
  const page = Math.max(1, Number(firstParam(sp.page) ?? "1") || 1)

  const { rows, totalCount, totalPages } = await listApplicationsForAdmin(filters, page)

  const buildHref = (overrides: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    const merged = { ...sp, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      const val = Array.isArray(v) ? v[0] : v
      if (val !== undefined && val !== "") q.set(k, String(val))
    }
    return `/admin/applications?${q.toString()}`
  }

  const activeFilterCount = [filters.q, filters.kind, filters.status].filter(Boolean).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مقدّمو الخدمة"
        title="طلبات الانضمام"
        description={`${totalCount.toLocaleString("ar-SA-u-nu-latn")} طلب إجمالًا${activeFilterCount > 0 ? ` — ${activeFilterCount} فلتر مطبَّق` : ""}`}
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
            <Link href="/admin/applications" className="text-xs font-medium text-primary hover:underline">
              مسح الكل
            </Link>
          )}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="بحث">
            <Input name="q" defaultValue={filters.q ?? ""} placeholder="اسم أو بريد مقدّم الطلب…" />
          </Field>
          <Field label="النوع">
            <Select name="kind" defaultValue={filters.kind ?? ""}>
              <option value="">الكل</option>
              <option value="DOCTOR">طبيب</option>
              <option value="CENTER">مركز</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select name="status" defaultValue={filters.status ?? ""}>
              <option value="">الكل</option>
              {Object.entries(STATUS_TONE).map(([key, tone]) => (
                <option key={key} value={key}>{tone.label}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">تطبيق الفلاتر</Button>
            <Button type="button" variant="ghost" render={<Link href="/admin/applications">إعادة ضبط</Link>} />
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Inbox}
            title="لا توجد طلبات حتى الآن"
            description="ستظهر هنا طلبات انضمام الأطباء والمراكز بمجرد تقديمها."
            tone="muted"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const p = (r.payload ?? {}) as Payload
            const isDoctor = r.kind === "DOCTOR"
            const open = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(
              r.status,
            )
            const displayName = isDoctor
              ? (p.name ?? r.applicantName)
              : (p.name ?? p.legalName ?? r.applicantName)
            const initial = displayName.trim().charAt(0) || "؟"
            const tone = STATUS_TONE[r.status] ?? STATUS_TONE.SUBMITTED
            const items = isDoctor ? (p.procedures ?? []) : (p.services ?? [])
            const licenseExpiry = isDoctor
              ? p.license?.expiryDate
              : p.license?.licenseExpiryDate

            return (
              <Card key={r.id} className="relative overflow-hidden p-0">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={
                          "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 " +
                          (isDoctor
                            ? "bg-primary/10 text-primary ring-primary/15"
                            : "bg-secondary/60 text-secondary-foreground ring-border/70")
                        }
                      >
                        {isDoctor ? (
                          <Stethoscope className="size-5" />
                        ) : (
                          <Building2 className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                          {isDoctor ? "طلب طبيب" : "طلب مركز"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-lg font-bold text-foreground">
                            {displayName}
                          </h3>
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 " +
                              tone.classes +
                              " " +
                              tone.ring
                            }
                          >
                            {tone.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {p.title && <span>{p.title}</span>}
                          {(p.city || p.country) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {[p.city, countryNameAr(p.country ?? "")]
                                .filter(Boolean)
                                .join("، ")}
                            </span>
                          )}
                          {isDoctor && p.yearsExperience != null && (
                            <span>خبرة {p.yearsExperience} سنة</span>
                          )}
                        </div>
                        <p
                          dir="ltr"
                          className="mt-1 text-end text-[11px] text-muted-foreground/80"
                        >
                          {r.applicantEmail}
                        </p>
                      </div>
                    </div>
                    <span className="hidden shrink-0 items-center gap-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tabular-nums tracking-wider text-primary sm:inline-flex">
                      #{initial}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                    <InfoLine
                      icon={Languages}
                      label="اللغات"
                      value={(p.languages ?? []).join("، ") || "—"}
                    />
                    <InfoLine
                      icon={Sparkles}
                      label={isDoctor ? "الإجراءات" : "الخدمات"}
                      value={items.join("، ") || "—"}
                    />
                    <InfoLine
                      icon={FileText}
                      label={isDoctor ? "الترخيص" : "السجل التجاري"}
                      value={
                        isDoctor
                          ? p.license
                            ? `${p.license.number ?? "—"} · ${p.license.issuingAuthority ?? ""}`
                            : "—"
                          : p.license?.commercialRegistrationLast4
                            ? `•••• ${p.license.commercialRegistrationLast4}`
                            : "—"
                      }
                    />
                    <InfoLine
                      icon={Calendar}
                      label="انتهاء الترخيص"
                      value={licenseExpiry ?? "—"}
                    />
                  </dl>

                  {r.notes && (
                    <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                      <p className="mb-1 font-medium text-foreground">
                        ملاحظة المراجع
                      </p>
                      <p className="text-muted-foreground">{r.notes}</p>
                    </div>
                  )}

                  {open && (
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <ApplicationReview applicationId={r.id} isDoctor={isDoctor} />
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={15}
            buildHref={(p) => buildHref({ page: p })}
          />
        </div>
      )}
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

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
      <div className="min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className="mt-0.5 truncate text-foreground">{value}</p>
      </div>
    </div>
  )
}
