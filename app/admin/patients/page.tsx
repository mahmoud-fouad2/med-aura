import Link from "next/link"
import { Users, Search, X, ChevronLeft } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listPatientsForAdmin } from "@/lib/data/admin-directory"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { countryNameAr } from "@/lib/status-labels"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "المرضى" }


export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.USER_READ_ANY)
  const sp = await searchParams
  const q = firstParam(sp.q)

  const patients = await listPatientsForAdmin(q)
  const withCases = patients.filter((p) => p.caseCount > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الدليل"
        title="المرضى"
        description={`${patients.length.toLocaleString("ar-SA-u-nu-latn")} مريض مسجَّل${q ? ` مطابق للبحث "${q}"` : ""}`}
        stats={
          patients.length > 0
            ? [
                { label: "الإجمالي", value: patients.length.toLocaleString("ar-SA-u-nu-latn") },
                { label: "لديهم حالات", value: withCases.length.toLocaleString("ar-SA-u-nu-latn") },
              ]
            : undefined
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="ابحث بالاسم أو البريد الإلكتروني…"
              className="h-9 ps-9"
            />
          </div>
          <Button type="submit" size="sm">
            <Search className="size-4" />
            بحث
          </Button>
          {q && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              render={
                <Link href="/admin/patients">
                  <X className="size-4" />
                  إعادة ضبط
                </Link>
              }
            />
          )}
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {patients.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Users}
              title={q ? "لا يوجد مرضى مطابقون" : "لا يوجد مرضى بعد"}
              description={
                q
                  ? "جرّب تعديل كلمات البحث."
                  : "سيظهر المرضى هنا بمجرد تسجيلهم على المنصة."
              }
              tone="muted"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 p-3 sm:hidden">
              {patients.map((p) => {
                const initial = p.name.trim().charAt(0) || "؟"
                return (
                  <MobileDataCard
                    key={p.userId}
                    title={
                      <span className="flex items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                          {initial}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </span>
                    }
                    subtitle={<span dir="ltr">{p.email}</span>}
                    rows={[
                      {
                        label: "الموقع",
                        value: `${p.city ? `${p.city}، ` : ""}${p.residenceCountry ? countryNameAr(p.residenceCountry) : "—"}`,
                      },
                      {
                        label: "تاريخ التسجيل",
                        value: new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn"),
                      },
                    ]}
                    actions={
                      p.caseCount > 0 ? (
                        <Link
                          href={`/admin/cases?q=${encodeURIComponent(p.name)}`}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary hover:bg-primary/15"
                        >
                          {p.caseCount.toLocaleString("ar-SA-u-nu-latn")} حالة
                        </Link>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60">لا توجد حالات</span>
                      )
                    }
                  />
                )
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
                  <Th>الاسم</Th>
                  <Th>البريد الإلكتروني</Th>
                  <Th>الدولة</Th>
                  <Th>المدينة</Th>
                  <Th>الحالات</Th>
                  <Th>تاريخ التسجيل</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {patients.map((p) => {
                  const initial = p.name.trim().charAt(0) || "؟"
                  return (
                    <tr
                      key={p.userId}
                      className="transition-colors hover:bg-muted/25"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                            {initial}
                          </span>
                          <span className="font-medium text-foreground">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td
                        dir="ltr"
                        className="px-4 py-3 text-end text-xs text-muted-foreground"
                      >
                        {p.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.residenceCountry
                          ? countryNameAr(p.residenceCountry)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.city ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {p.caseCount > 0 ? (
                          <Link
                            href={`/admin/cases?q=${encodeURIComponent(p.name)}`}
                            className="group inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary hover:bg-primary/15"
                          >
                            {p.caseCount.toLocaleString("ar-SA-u-nu-latn")} حالة
                            <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-start font-medium tracking-wide">
      {children}
    </th>
  )
}
