import { Globe2 } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCountriesForAdmin, listCitiesForAdmin } from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/admin/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "الدول والمدن" }

export default async function AdminGeographyPage() {
  await requirePermissionPage(PERMISSIONS.CATALOG_MANAGE)

  const [countries, cities] = await Promise.all([listCountriesForAdmin(), listCitiesForAdmin()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">الدول والمدن</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {countries.length.toLocaleString("ar-SA-u-nu-latn")} دولة، {cities.length.toLocaleString("ar-SA-u-nu-latn")} مدينة
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الدول</h2>
        </div>
        {countries.length === 0 ? (
          <EmptyState icon={Globe2} title="لا توجد دول مضافة" description="أضف الدول عبر seed-catalog." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <Th>الاسم</Th>
                <Th>الرمز</Th>
                <Th>الحالة</Th>
                <Th>عدد المدن</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {countries.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.nameAr}</td>
                  <td dir="ltr" className="px-4 py-3 text-end text-muted-foreground">{c.code}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={c.active ? "success" : "neutral"} label={c.active ? "نشطة" : "غير نشطة"} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cityCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">المدن</h2>
        </div>
        {cities.length === 0 ? (
          <EmptyState icon={Globe2} title="لا توجد مدن مضافة" description="أضف المدن عبر seed-catalog." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <Th>المدينة</Th>
                <Th>الدولة</Th>
                <Th>الحالة</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cities.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.nameAr}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.countryNameAr}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={c.active ? "success" : "neutral"} label={c.active ? "نشطة" : "غير نشطة"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
