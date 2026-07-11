import Link from "next/link"
import {
  Building2,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronLeft,
  Users as UsersIcon,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCentersForAdmin } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { PageHeader } from "@/components/dashboard/page-header"
import { countryNameAr } from "@/lib/status-labels"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "المراكز" }

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  suspended: "موقوف",
}

function statusTone(status: string): StatusTone {
  if (status === "approved") return "success"
  if (status === "suspended" || status === "rejected") return "danger"
  return "warning"
}


export default async function AdminCentersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const sp = await searchParams
  const q = firstParam(sp.q)
  const status = firstParam(sp.status)

  const centers = await listCentersForAdmin({ q, status })
  const approved = centers.filter((c) => c.status === "approved").length
  const pending = centers.filter((c) => c.status === "pending").length

  const buildHref = (s: string | undefined) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (s) params.set("status", s)
    return `/admin/centers?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مقدّمو الخدمة"
        title="المراكز"
        description={`${centers.length.toLocaleString("ar-SA-u-nu-latn")} مركز${status ? ` — ${STATUS_LABEL[status]}` : ""}${q ? ` مطابق للبحث "${q}"` : ""}`}
        stats={
          !status && centers.length > 0
            ? [
                { label: "المعتمدة", value: approved.toLocaleString("ar-SA-u-nu-latn") },
                { label: "قيد المراجعة", value: pending.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="space-y-3 p-4">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="status" value={status ?? ""} />
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="ابحث باسم المركز…"
              className="h-9 ps-9"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="size-4" />
            بحث
          </Button>
        </form>
        <div className="flex flex-wrap gap-1 border-t border-border/60 pt-3">
          <TabLink active={!status} href={buildHref(undefined)}>
            الكل ({centers.length.toLocaleString("ar-SA-u-nu-latn")})
          </TabLink>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <TabLink key={k} active={status === k} href={buildHref(k)}>
              {label}
            </TabLink>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {centers.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Building2}
              title={q || status ? "لا توجد مراكز مطابقة" : "لا توجد مراكز بعد"}
              description={
                q || status
                  ? "جرّب تعديل الفلاتر أو كلمات البحث."
                  : "ستظهر المراكز هنا بمجرد الموافقة على طلبات انضمامها."
              }
              tone="muted"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>الحالة</Th>
                  <Th>الملف</Th>
                  <Th>الموقع</Th>
                  <Th>الأطباء</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {centers.map((c) => {
                  const initial = c.name.trim().charAt(0) || "م"
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-muted/25"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                            {initial}
                          </span>
                          <span className="font-medium text-foreground">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={statusTone(c.status)}
                          label={STATUS_LABEL[c.status] ?? c.status}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {c.published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                            <Eye className="size-3" />
                            ظاهر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <EyeOff className="size-3" />
                            مخفي
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.city ? `${c.city}، ` : ""}
                        {countryNameAr(c.country)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                          <UsersIcon className="size-3" />
                          {c.doctorCount.toLocaleString("ar-SA-u-nu-latn")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/centers/${c.slug}`}
                          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          الملف
                          <ExternalLink className="size-3" />
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
