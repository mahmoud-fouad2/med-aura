import Link from "next/link"
import { Stethoscope } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listDoctorsForAdmin } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "الأطباء" }

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

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

export default async function AdminDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const sp = await searchParams
  const q = str(sp.q)
  const status = str(sp.status)

  const doctors = await listDoctorsForAdmin({ q, status })

  const buildHref = (s: string | undefined) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (s) params.set("status", s)
    return `/admin/doctors?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">الأطباء</h1>
        <p className="mt-1 text-sm text-muted-foreground">{doctors.length.toLocaleString("ar-SA")} طبيب</p>
      </div>

      <Card className="space-y-3 p-4">
        <form method="get" className="flex gap-2">
          <input type="hidden" name="status" value={status ?? ""} />
          <Input name="q" defaultValue={q ?? ""} placeholder="ابحث باسم الطبيب…" className="max-w-sm" />
          <Button type="submit">بحث</Button>
        </form>
        <div className="flex flex-wrap gap-1">
          <TabLink active={!status} href={buildHref(undefined)}>الكل</TabLink>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <TabLink key={k} active={status === k} href={buildHref(k)}>{label}</TabLink>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {doctors.length === 0 ? (
          <EmptyState icon={Stethoscope} title="لا يوجد أطباء مطابقون" description="جرّب تعديل الفلاتر أو كلمات البحث." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>الحالة</Th>
                  <Th>ظاهر للعامة</Th>
                  <Th>المركز</Th>
                  <Th>الدولة</Th>
                  <Th>سنوات الخبرة</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doctors.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(d.status)} label={STATUS_LABEL[d.status] ?? d.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{d.published ? "نعم" : "لا"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.centerName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.city ? `${d.city}، ` : ""}{countryNameAr(d.country)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.yearsExperience}</td>
                    <td className="px-4 py-3">
                      <Link href={`/doctors/${d.slug}`} className="text-xs font-medium text-primary hover:underline">
                        عرض الملف
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
