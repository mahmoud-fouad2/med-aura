import Link from "next/link"
import { ClipboardList, CalendarCheck } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listFollowUpsForAdmin, type FollowUpFilters } from "@/lib/data/admin-followups"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
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

  const buildHref = (status: string | undefined) => {
    const q = new URLSearchParams()
    if (status) q.set("status", status)
    return `/admin/follow-ups?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">المتابعات</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tasks.length.toLocaleString("ar-SA")} مهمة</p>
      </div>

      <Card className="flex flex-wrap items-center gap-1 p-3">
        <TabLink active={filters.status === "open"} href={buildHref("open")}>قيد الانتظار</TabLink>
        <TabLink active={filters.status === "overdue"} href={buildHref("overdue")}>متأخرة</TabLink>
        <TabLink active={filters.status === "completed"} href={buildHref("completed")}>مكتملة</TabLink>
        <TabLink active={filters.status === undefined} href={buildHref(undefined)}>الكل</TabLink>
      </Card>

      <Card className="overflow-hidden p-0">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="لا توجد مهام مطابقة"
            description="لا توجد مهام متابعة في هذا التصنيف حاليًا."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>المهمة</Th>
                  <Th>النوع</Th>
                  <Th>الحالة</Th>
                  <Th>المريض</Th>
                  <Th>الطبيب</Th>
                  <Th>الاستحقاق</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[t.type] ?? t.type}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(t.status, t.overdue)} label={t.overdue && t.status !== "MISSED" ? "متأخرة" : followUpTaskStatusAr(t.status)} />
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {t.patientName}
                      <span className="block text-xs text-muted-foreground">{t.caseReference}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.doctorName ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {t.dueAt ? new Date(t.dueAt).toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/cases/${t.caseId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <ClipboardList className="size-3.5" /> فتح الحالة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {children}
    </Link>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
