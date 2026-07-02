import Link from "next/link"
import { Users } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listPatientsForAdmin } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "المرضى" }

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const sp = await searchParams
  const q = str(sp.q)

  const patients = await listPatientsForAdmin(q)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">المرضى</h1>
        <p className="mt-1 text-sm text-muted-foreground">{patients.length.toLocaleString("ar-SA")} مريض</p>
      </div>

      <Card className="p-4">
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="ابحث بالاسم أو البريد الإلكتروني…" className="max-w-sm" />
          <Button type="submit">بحث</Button>
          {q && <Button type="button" variant="ghost" render={<Link href="/admin/patients">إعادة ضبط</Link>} />}
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {patients.length === 0 ? (
          <EmptyState icon={Users} title="لا يوجد مرضى مطابقون" description="جرّب تعديل كلمات البحث." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>البريد الإلكتروني</Th>
                  <Th>الدولة</Th>
                  <Th>المدينة</Th>
                  <Th>عدد الحالات</Th>
                  <Th>تاريخ التسجيل</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => (
                  <tr key={p.userId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td dir="ltr" className="px-4 py-3 text-end text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.residenceCountry ? countryNameAr(p.residenceCountry) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.caseCount > 0 ? (
                        <Link href={`/admin/cases?q=${encodeURIComponent(p.name)}`} className="text-primary hover:underline">
                          {p.caseCount.toLocaleString("ar-SA")}
                        </Link>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("ar-SA")}
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
