import Link from "next/link"
import { asc, eq } from "drizzle-orm"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { SearchX } from "lucide-react"
import { DoctorCard } from "@/components/search/doctor-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { searchDoctors, type SearchParams } from "@/lib/data/doctors"
import { db } from "@/lib/db"
import { query } from "@/lib/db/query"
import { DataState } from "@/components/ui/data-state"
import { procedureCategory, country as countryT } from "@/lib/db/schema"
import { getI18n } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "ابحث عن طبيب تجميل",
  description: "ابحث وقارن بين أطباء التجميل المعتمدين حسب الإجراء والدولة والمدينة.",
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { t } = await getI18n()

  const params: SearchParams = {
    q: str(sp.q),
    procedure: str(sp.procedure),
    category: str(sp.category),
    country: str(sp.country),
    city: str(sp.city),
    consultation: str(sp.consultation) as SearchParams["consultation"],
    surgical: str(sp.surgical) as SearchParams["surgical"],
    page: Number(str(sp.page) ?? "1") || 1,
  }

  const [doctorsRes, categoriesRes, countriesRes] = await Promise.all([
    query(() => searchDoctors(params)),
    query(() =>
      db
        .select({ slug: procedureCategory.slug, nameAr: procedureCategory.nameAr })
        .from(procedureCategory)
        .where(eq(procedureCategory.visible, true))
        .orderBy(asc(procedureCategory.sortOrder)),
    ),
    query(() =>
      db
        .select({ code: countryT.code, nameAr: countryT.nameAr })
        .from(countryT)
        .where(eq(countryT.active, true))
        .orderBy(asc(countryT.sortOrder)),
    ),
  ])

  const categories = categoriesRes.status === "ok" ? categoriesRes.data : []
  const countries = countriesRes.status === "ok" ? countriesRes.data : []
  const results = doctorsRes.status === "ok" ? doctorsRes.data.results : []
  const total = doctorsRes.status === "ok" ? doctorsRes.data.total : 0

  const pageSize = 12
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = params.page ?? 1

  const buildPageHref = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) {
      const val = str(v)
      if (val) q.set(k, val)
    }
    q.set("page", String(p))
    return `/search?${q.toString()}`
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {t.search.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.search.resultsCount(total)}
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Filters — GET form, so filters live in the URL and survive back/refresh */}
            <aside>
              <Card className="p-4">
                <form method="get" className="flex flex-col gap-4">
                  <FilterField label={t.search.procedure}>
                    <select
                      name="category"
                      defaultValue={params.category ?? ""}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">الكل</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </FilterField>

                  <FilterField label={t.search.country}>
                    <select
                      name="country"
                      defaultValue={params.country ?? ""}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">الكل</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </FilterField>

                  <FilterField label={t.search.consultationType}>
                    <select
                      name="consultation"
                      defaultValue={params.consultation ?? ""}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">الكل</option>
                      <option value="VIDEO_CONSULTATION">فيديو</option>
                      <option value="IN_PERSON_CONSULTATION">حضوري</option>
                    </select>
                  </FilterField>

                  <FilterField label="النوع">
                    <select
                      name="surgical"
                      defaultValue={params.surgical ?? ""}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">الكل</option>
                      <option value="true">جراحي</option>
                      <option value="false">غير جراحي</option>
                    </select>
                  </FilterField>

                  <FilterField label="بحث بالاسم">
                    <Input name="q" defaultValue={params.q ?? ""} placeholder="اسم الطبيب" />
                  </FilterField>

                  <Button type="submit" className="w-full">
                    تطبيق
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    render={<Link href="/search">إعادة ضبط</Link>}
                  />
                </form>
              </Card>
            </aside>

            {/* Results */}
            <section>
              {doctorsRes.status !== "ok" ? (
                <DataState
                  status={doctorsRes.status}
                  requestId={
                    doctorsRes.status === "error" ? doctorsRes.requestId : undefined
                  }
                />
              ) : results.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="لا توجد نتائج مطابقة"
                  description={t.search.empty}
                />
              ) : (
                <>
                  <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((d) => (
                      <StaggerItem key={d.id}>
                        <DoctorCard doctor={d} />
                      </StaggerItem>
                    ))}
                  </Stagger>

                  {totalPages > 1 && (
                    <nav className="mt-8 flex items-center justify-center gap-2">
                      {page > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={buildPageHref(page - 1)}>السابق</Link>}
                        />
                      )}
                      <span className="text-sm text-muted-foreground">
                        صفحة {page} من {totalPages}
                      </span>
                      {page < totalPages && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={buildPageHref(page + 1)}>التالي</Link>}
                        />
                      )}
                    </nav>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
