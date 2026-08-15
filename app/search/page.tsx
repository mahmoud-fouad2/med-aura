import Link from "next/link"
import Image from "next/image"
import { asc, eq } from "drizzle-orm"
import {
  Search,
  SearchX,
  SlidersHorizontal,
  ChevronLeft,
  ShieldCheck,
  Star,
  Video,
  Sparkles,
} from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { DoctorCard } from "@/components/search/doctor-card"
import { UseMyLocationButton } from "@/components/search/use-my-location-button"
import { EmptyState } from "@/components/ui/empty-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { searchDoctors, type SearchParams } from "@/lib/data/doctors"
import { db } from "@/lib/db"
import { query } from "@/lib/db/query"
import { DataState } from "@/components/ui/data-state"
import { procedureCategory, country as countryT } from "@/lib/db/schema"
import { getI18n } from "@/lib/i18n"
import { getCurrentUser } from "@/lib/session"
import { getFavoriteRefIds } from "@/lib/data/favorites"
import { firstParam } from "@/lib/utils"
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, itemListJsonLd, jsonLdScript } from "@/lib/seo"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "ابحث عن طبيب تجميل",
  description: "قارن بين أطباء تجميل معتمدين حسب الإجراء والمدينة ونوع الاستشارة والتقييمات المتاحة.",
  path: "/search",
  image: "/hero-medaura-consultation.png",
})


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { locale, t } = await getI18n()
  const isAr = locale === "ar"

  const params: SearchParams = {
    q: firstParam(sp.q),
    procedure: firstParam(sp.procedure),
    category: firstParam(sp.category),
    country: firstParam(sp.country),
    city: firstParam(sp.city),
    consultation: firstParam(sp.consultation) as SearchParams["consultation"],
    surgical: firstParam(sp.surgical) as SearchParams["surgical"],
    page: Number(firstParam(sp.page) ?? "1") || 1,
    sort: firstParam(sp.sort) as SearchParams["sort"],
    lat: firstParam(sp.lat) ? Number(firstParam(sp.lat)) : undefined,
    lng: firstParam(sp.lng) ? Number(firstParam(sp.lng)) : undefined,
  }
  const nearestActive = params.sort === "nearest" && params.lat != null && params.lng != null

  const user = await getCurrentUser()

  const [doctorsRes, categoriesRes, countriesRes, favs] = await Promise.all([
    query(() => searchDoctors(params)),
    query(() =>
      db
        .select({ slug: procedureCategory.slug, nameAr: procedureCategory.nameAr, nameEn: procedureCategory.nameEn })
        .from(procedureCategory)
        .where(eq(procedureCategory.visible, true))
        .orderBy(asc(procedureCategory.sortOrder)),
    ),
    query(() =>
      db
        .select({ code: countryT.code, nameAr: countryT.nameAr, nameEn: countryT.nameEn })
        .from(countryT)
        .where(eq(countryT.active, true))
        .orderBy(asc(countryT.sortOrder)),
    ),
    user
      ? getFavoriteRefIds(user.id)
      : Promise.resolve({
          doctor: new Set<string>(),
          center: new Set<string>(),
          procedure: new Set<string>(),
        }),
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
      const val = firstParam(v)
      if (val) q.set(k, val)
    }
    q.set("page", String(p))
    return `/search?${q.toString()}`
  }

  const currentQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => {
      const val = firstParam(v)
      return val ? [[k, val] as [string, string]] : []
    }),
  ).toString()

  const activeFilters = [
    params.category,
    params.country,
    params.city,
    params.consultation,
    params.surgical,
    params.q,
  ].filter(Boolean).length
  const structuredData = [
    breadcrumbJsonLd([
      { name: isAr ? "الرئيسية" : "Home", url: absoluteUrl("/") },
      { name: isAr ? "الأطباء" : "Doctors", url: absoluteUrl("/search") },
    ]),
    itemListJsonLd({
      name: isAr ? "أطباء التجميل على Med Aura" : "Aesthetic doctors on Med Aura",
      items: results.map((doctor) => ({
        name: doctor.name,
        url: absoluteUrl(`/doctors/${doctor.slug}`),
        ...(doctor.photoUrl ? { image: absoluteUrl(doctor.photoUrl) } : {}),
      })),
    }),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1 bg-section-soft">
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="absolute inset-0">
            <Image
              src="/hero-medaura-consultation.png"
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/95 to-background/70 ltr:bg-gradient-to-r" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="max-w-3xl">
              <p className="font-heading text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {isAr ? "أطباء موثوقون" : "Verified doctors"}
              </p>
              <h1 className="mt-3 text-balance font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                {isAr ? "اختر طبيب تجميل بثقة ووضوح" : "Choose your aesthetic doctor with confidence"}
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {isAr ? "ابحث حسب الإجراء أو المدينة، وقارن بين الخبرة ونوع الاستشارة قبل أن تبدأ." : "Search by procedure or city, then compare experience and consultation options."}
              </p>

              <form
                method="get"
                className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/70 bg-card/90 p-2 shadow-elegant backdrop-blur-md sm:flex-row"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-primary/70" />
                  <Input
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder={isAr ? "اسم الطبيب، الإجراء، أو المدينة..." : "Doctor, procedure, or city..."}
                    className="h-12 rounded-xl border-0 bg-transparent ps-11 text-base shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-xl">
                  {isAr ? "بحث" : "Search"}
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <QuickFilter href="/search?consultation=VIDEO_CONSULTATION" icon={Video}>
                  {isAr ? "استشارة فيديو" : "Video consultation"}
                </QuickFilter>
                <QuickFilter href="/search?surgical=false" icon={Sparkles}>
                  {isAr ? "غير جراحي" : "Non-surgical"}
                </QuickFilter>
                <QuickFilter href="/search?category=face-neck" icon={Star}>
                  {isAr ? "الوجه والرقبة" : "Face & neck"}
                </QuickFilter>
              </div>
            </div>

          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {t.search.resultsCount(total)}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">
                {isAr ? "نتائج تناسب بحثك" : "Doctors matching your search"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <UseMyLocationButton active={nearestActive} currentQuery={currentQuery} />
              {activeFilters > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/search">{isAr ? "مسح الفلاتر" : "Clear filters"} ({activeFilters})</Link>}
                />
              )}
            </div>
          </div>

          <details className="mb-5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-heading text-sm font-bold text-foreground">
              <SlidersHorizontal className="size-4 text-primary" />
              {isAr ? "عوامل التصفية" : "Filters"}
              {activeFilters > 0 && (
                <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  {activeFilters}
                </span>
              )}
            </summary>
            <div className="mt-4">
              <FiltersPanel
                params={params}
                categories={categories}
                countries={countries}
                activeFilters={activeFilters}
                locale={locale}
                compact
              />
            </div>
          </details>

          <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
            <aside className="hidden lg:block">
              <FiltersPanel
                params={params}
                categories={categories}
                countries={countries}
                activeFilters={activeFilters}
                locale={locale}
              />
            </aside>

            <section>
              {doctorsRes.status !== "ok" ? (
                <DataState
                  status={doctorsRes.status}
                  requestId={
                    doctorsRes.status === "error" ? doctorsRes.requestId : undefined
                  }
                />
              ) : results.length === 0 ? (
                <Card className="p-10">
                  <EmptyState
                    icon={SearchX}
                    title={isAr ? "لا توجد نتائج مطابقة" : "No matching results"}
                    description={t.search.empty}
                    action={
                      activeFilters > 0 ? (
                        <Button
                          variant="outline"
                          render={<Link href="/search">{isAr ? "مسح كل الفلاتر" : "Clear all filters"}</Link>}
                        />
                      ) : undefined
                    }
                  />
                </Card>
              ) : (
                <>
                  <Stagger className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    {results.map((d) => (
                      <StaggerItem key={d.id}>
                        <DoctorCard
                          doctor={d}
                          locale={locale}
                          isSignedIn={Boolean(user)}
                          favorited={favs.doctor.has(d.id)}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>

                  {totalPages > 1 && (
                    <nav className="mt-10 flex items-center justify-center gap-3">
                      {page > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={buildPageHref(page - 1)}>
                              <ChevronLeft className="size-3.5 rtl:rotate-180 ltr:rotate-0" />
                              {isAr ? "السابق" : "Previous"}
                            </Link>
                          }
                        />
                      )}
                      <span className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
                      </span>
                      {page < totalPages && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={buildPageHref(page + 1)}>
                              {isAr ? "التالي" : "Next"}
                              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                            </Link>
                          }
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

function FiltersPanel({
  params,
  categories,
  countries,
  activeFilters,
  locale,
  compact = false,
}: {
  params: SearchParams
  categories: { slug: string; nameAr: string; nameEn: string }[]
  countries: { code: string; nameAr: string; nameEn: string }[]
  activeFilters: number
  locale: "ar" | "en"
  compact?: boolean
}) {
  const isAr = locale === "ar"
  return (
    <Card className={(compact ? "border-0 p-0 shadow-none" : "sticky top-24 p-5") + " bg-card/90"}>
      {!compact && (
        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="font-heading text-sm font-bold text-foreground">
            {isAr ? "عوامل التصفية" : "Filters"}
          </h2>
          {activeFilters > 0 && (
            <span className="ms-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {activeFilters}
            </span>
          )}
        </div>
      )}
      <form method="get" className="flex flex-col gap-4">
        <FilterField label={isAr ? "الإجراء" : "Procedure"}>
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className={fieldClassName}
          >
            <option value="">{isAr ? "كل الإجراءات" : "All procedures"}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {isAr ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={isAr ? "الدولة" : "Country"}>
          <select
            name="country"
            defaultValue={params.country ?? ""}
            className={fieldClassName}
          >
            <option value="">{isAr ? "كل الدول" : "All countries"}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {isAr ? c.nameAr : c.nameEn}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label={isAr ? "نوع الاستشارة" : "Consultation type"}>
          <select
            name="consultation"
            defaultValue={params.consultation ?? ""}
            className={fieldClassName}
          >
            <option value="">{isAr ? "كل الأنواع" : "All types"}</option>
            <option value="VIDEO_CONSULTATION">{isAr ? "فيديو" : "Video"}</option>
            <option value="IN_PERSON_CONSULTATION">{isAr ? "حضورية" : "In person"}</option>
          </select>
        </FilterField>

        <FilterField label={isAr ? "نوع الإجراء" : "Procedure type"}>
          <select
            name="surgical"
            defaultValue={params.surgical ?? ""}
            className={fieldClassName}
          >
            <option value="">{isAr ? "الكل" : "All"}</option>
            <option value="true">{isAr ? "جراحي" : "Surgical"}</option>
            <option value="false">{isAr ? "غير جراحي" : "Non-surgical"}</option>
          </select>
        </FilterField>

        <FilterField label={isAr ? "بحث سريع" : "Quick search"}>
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={isAr ? "اسم، مدينة، أو تخصص" : "Name, city, or specialty"}
          />
        </FilterField>

        <Button type="submit" className="w-full">
          {isAr ? "تطبيق الفلاتر" : "Apply filters"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          render={<Link href="/search">{isAr ? "إعادة ضبط" : "Reset"}</Link>}
        />
      </form>
    </Card>
  )
}

const fieldClassName =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary"

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

function QuickFilter({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-card/85 px-3 py-1.5 font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
    >
      <Icon className="size-3.5 text-primary" />
      {children}
    </Link>
  )
}

function TrustPoint({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
