import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { providerApplication, user as userT } from "@/lib/db/schema"
import {
  Inbox,
  Stethoscope,
  Building2,
  MapPin,
  Languages,
  Sparkles,
  FileText,
  Calendar,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ApplicationReview } from "@/components/admin/application-review"
import { PageHeader } from "@/components/dashboard/page-header"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { countryNameAr } from "@/lib/status-labels"

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

export default async function ApplicationsPage() {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const rows = await db
    .select({
      id: providerApplication.id,
      kind: providerApplication.kind,
      status: providerApplication.status,
      payload: providerApplication.payload,
      submittedAt: providerApplication.submittedAt,
      notes: providerApplication.reviewerNotes,
      applicantName: userT.name,
      applicantEmail: userT.email,
    })
    .from(providerApplication)
    .innerJoin(userT, eq(providerApplication.applicantUserId, userT.id))
    .orderBy(desc(providerApplication.createdAt))
    .limit(50)

  const openCount = rows.filter((r) =>
    ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(r.status),
  ).length
  const doctorCount = rows.filter((r) => r.kind === "DOCTOR").length
  const centerCount = rows.filter((r) => r.kind === "CENTER").length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مقدّمو الخدمة"
        title="طلبات الانضمام"
        description="طلبات الأطباء والمراكز بانتظار مراجعة فريق المراجعة والاعتماد."
        stats={
          rows.length > 0
            ? [
                { label: "بانتظار المراجعة", value: openCount.toLocaleString("ar-SA-u-nu-latn") },
                { label: "طلبات أطباء", value: doctorCount.toLocaleString("ar-SA-u-nu-latn") },
                { label: "طلبات مراكز", value: centerCount.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

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
        </div>
      )}
    </div>
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
