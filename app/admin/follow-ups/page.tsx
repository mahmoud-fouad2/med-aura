import Link from "next/link"
import {
  ClipboardList,
  CalendarCheck,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listFollowUpsForAdmin,
  type FollowUpFilters,
} from "@/lib/data/admin-followups"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { PageHeader } from "@/components/dashboard/page-header"
import { followUpTaskStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "المتابعات" }

const TYPE_LABELS: Record<string, string> = {
  PHOTO_UPLOAD: "رفع صور",
  QUESTIONNAIRE: "استبيان",
  VIDEO_APPOINTMENT: "موعد فيديو",
  IN_PERSON_APPOINTMENT: "موعد حضوري",
  MEDICATION_REMINDER: "تذكير بالدواء",
  GENERAL_CHECK: "متابعة عامة",
  DOCTOR_REVIEW: "مراجعة الطبيب",
}

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

function statusTone(status: string, overdue: boolean): StatusTone {
  if (overdue || status === "MISSED") return "danger"
  if (status === "COMPLETED") return "success"
  if (["SUBMITTED", "UNDER_REVIEW"].includes(status)) return "warning"
  if (status === "ESCALATED") return "danger"
  return "neutral"
}

export default async function AdminFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.CASE_READ_ANY)
  const sp = await searchParams
  const filters: FollowUpFilters = { status: str(sp.status) ?? "open" }

  const tasks = await listFollowUpsForAdmin(filters)
  const overdueCount = tasks.filter((t) => t.overdue).length
  const openCount = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED",
  ).length

  const buildHref = (status: string | undefined) => {
    const q = new URLSearchParams()
    if (status) q.set("status", status)
    return `/admin/follow-ups?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الرعاية"
        title="متابعات ما بعد الإجراء"
        description="مهام المتابعة للمرضى بعد الإجراء — تصفية حسب حالة المهمة."
        stats={
          tasks.length > 0
            ? [
                { label: "الإجمالي", value: tasks.length.toLocaleString("ar-SA-u-nu-latn") },
                { label: "مفتوحة", value: openCount.toLocaleString("ar-SA-u-nu-latn") },
                { label: "متأخرة", value: overdueCount.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="flex flex-wrap items-center gap-1 p-3">
        <TabLink active={filters.status === "open"} href={buildHref("open")}>
          قيد الانتظار
        </TabLink>
        <TabLink
          active={filters.status === "overdue"}
          href={buildHref("overdue")}
        >
          متأخرة
        </TabLink>
        <TabLink
          active={filters.status === "completed"}
          href={buildHref("completed")}
        >
          مكتملة
        </TabLink>
        <TabLink
          active={filters.status === undefined}
          href={buildHref(undefined)}
        >
          الكل
        </TabLink>
      </Card>

      <Card className="overflow-hidden p-0">
        {tasks.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={CalendarCheck}
              title="لا توجد مهام مطابقة"
              description="لا توجد مهام متابعة في هذا التصنيف حاليًا."
              tone="muted"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>المهمة</Th>
                  <Th>النوع</Th>
                  <Th>الحالة</Th>
                  <Th>المريض</Th>
                  <Th>الطبيب</Th>
                  <Th>الاستحقاق</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tasks.map((t) => {
                  const patientInitial = t.patientName.trim().charAt(0) || "؟"
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-muted/25"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {t.overdue && (
                            <AlertTriangle
                              className="size-4 shrink-0 text-destructive"
                              aria-label="متأخرة"
                            />
                          )}
                          <span className="font-medium text-foreground">
                            {t.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {TYPE_LABELS[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={statusTone(t.status, t.overdue)}
                          label={
                            t.overdue && t.status !== "MISSED"
                              ? "متأخرة"
                              : followUpTaskStatusAr(t.status)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/15">
                            {patientInitial}
                          </span>
                          <div>
                            <p className="text-foreground">{t.patientName}</p>
                            <p
                              dir="ltr"
                              className="font-mono text-[10px] text-muted-foreground"
                            >
                              {t.caseReference}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.doctorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.dueAt ? (
                          <span
                            className={
                              "tabular-nums " +
                              (t.overdue
                                ? "font-medium text-destructive"
                                : "text-muted-foreground")
                            }
                          >
                            {new Date(t.dueAt).toLocaleDateString("ar-SA-u-nu-latn")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/cases/${t.caseId}`}
                          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <ClipboardList className="size-3.5" />
                          فتح الحالة
                          <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_rgba(74,29,150,0.35)]"
          : "bg-muted text-muted-foreground hover:bg-muted/70")
      }
    >
      {children}
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-start font-medium tracking-wide">
      {children}
    </th>
  )
}
