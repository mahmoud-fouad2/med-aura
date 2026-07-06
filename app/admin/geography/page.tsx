import { Globe2, MapPin } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listCountriesForAdmin,
  listCitiesForAdmin,
} from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/admin/status-badge"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  CountryFormButton,
  CityFormButton,
  GeoToggleButton,
  GeoDeleteButton,
} from "@/components/admin/geography-forms"

export const dynamic = "force-dynamic"
export const metadata = { title: "الدول والمدن" }

export default async function AdminGeographyPage() {
  await requirePermissionPage(PERMISSIONS.CATALOG_MANAGE)

  const [countries, cities] = await Promise.all([
    listCountriesForAdmin(),
    listCitiesForAdmin(),
  ])
  const countryOptions = countries.map((c) => ({ id: c.id, nameAr: c.nameAr }))
  const activeCountries = countries.filter((c) => c.active).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المحتوى والإعداد"
        title="الدول والمدن"
        description="الوجهات المتاحة على المنصة — أضف، عدّل، فعّل أو عطّل، مع حماية تلقائية من حذف دولة مرتبطة ببيانات."
        stats={
          countries.length > 0
            ? [
                { label: "الدول", value: countries.length.toLocaleString("ar-SA-u-nu-latn") },
                { label: "النشطة", value: activeCountries.toLocaleString("ar-SA-u-nu-latn") },
                { label: "المدن", value: cities.length.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الدول</h2>
          <CountryFormButton />
        </div>
        {countries.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Globe2}
              title="لا توجد دول مضافة"
              description="ابدأ بإضافة أول دولة من الزر أعلاه."
              tone="muted"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>الكود</Th>
                  <Th>الترتيب</Th>
                  <Th>الحالة</Th>
                  <Th>المدن</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {countries.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{c.nameAr}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground">
                        {c.nameEn}
                      </div>
                    </td>
                    <td dir="ltr" className="px-4 py-3 text-end font-mono text-xs text-muted-foreground">
                      {c.code}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {c.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={c.active ? "success" : "neutral"}
                        label={c.active ? "نشطة" : "معطَّلة"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                        {c.cityCount.toLocaleString("ar-SA-u-nu-latn")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CountryFormButton existing={c} />
                        <GeoToggleButton kind="country" id={c.id} active={c.active} />
                        <GeoDeleteButton kind="country" id={c.id} name={c.nameAr} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">المدن</h2>
          <CityFormButton countries={countryOptions} />
        </div>
        {cities.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={MapPin}
              title="لا توجد مدن مضافة"
              description="أضف مدينة واربطها بدولة من الزر أعلاه."
              tone="muted"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>المدينة</Th>
                  <Th>الدولة</Th>
                  <Th>الحالة</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {cities.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{c.nameAr}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground">
                        {c.nameEn}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.countryNameAr}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={c.active ? "success" : "neutral"}
                        label={c.active ? "نشطة" : "معطَّلة"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CityFormButton existing={c} countries={countryOptions} />
                        <GeoToggleButton kind="city" id={c.id} active={c.active} />
                        <GeoDeleteButton kind="city" id={c.id} name={c.nameAr} />
                      </div>
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
  return (
    <th className="px-4 py-2.5 text-start font-medium tracking-wide">{children}</th>
  )
}
