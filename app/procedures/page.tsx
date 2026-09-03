import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Search, Syringe, Sparkles, X } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { CategoryIconBadge } from "@/components/marketing/category-icon"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { listProceduresGrouped } from "@/lib/data/procedures"
import { query } from "@/lib/db/query"
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  itemListJsonLd,
  jsonLdScript,
  localizedUrl,
  serviceImageForProcedure,
} from "@/lib/seo"
import { getI18n, localizedPath } from "@/lib/i18n"
import { SeoEditorialBand } from "@/components/marketing/seo-editorial-band"
import { firstParam } from "@/lib/utils"
import { formatRecoveryDays } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "إجراءات التجميل الجراحية وغير الجراحية" : "Surgical and non-surgical aesthetic procedures",
    description: locale === "ar"
      ? "تعرّف على إجراءات تجميل الوجه والجسم والبشرة والشعر والأسنان، وقارن نوع الإجراء وفترة العودة للروتين والأطباء المتاحين."
      : "Explore face, body, skin, hair, and dental aesthetic procedures, then compare procedure type, return-to-routine ranges, and available doctors.",
    path: "/procedures",
    image: "/demo-services/service-face-neck.png",
    locale,
    keywords: locale === "ar"
      ? ["إجراءات التجميل", "تجميل الأنف", "شد الوجه", "علاجات البشرة", "زراعة الشعر", "تجميل الأسنان"]
      : ["aesthetic procedures", "rhinoplasty", "facelift", "skin treatments", "hair transplant", "cosmetic dentistry"],
  })
}

export default async function ProceduresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, sp] = await Promise.all([getI18n(), searchParams])
  const isAr = locale === "ar"
  const q = firstParam(sp.q)?.trim() ?? ""
  const selectedCategory = firstParam(sp.category) ?? ""
  const res = await query(() => listProceduresGrouped())
  const groups = res.status === "ok" ? res.data : []
  const allVisibleGroups = groups.filter((g) => g.procedures.length > 0)
  const needle = q.toLocaleLowerCase(locale === "ar" ? "ar" : "en")
  const visibleGroups = allVisibleGroups
    .filter((g) => !selectedCategory || g.slug === selectedCategory)
    .map((g) => ({
      ...g,
      procedures: g.procedures.filter((p) => {
        if (!needle) return true
        return [p.nameAr, p.nameEn, p.descriptionAr, p.descriptionEn]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(needle))
      }),
    }))
    .filter((g) => g.procedures.length > 0)
  const total = visibleGroups.reduce((sum, group) => sum + group.procedures.length, 0)
  const breadcrumb = breadcrumbJsonLd([
    { name: isAr ? "الرئيسية" : "Home", url: localizedUrl("/", locale) },
    { name: isAr ? "إجراءات التجميل" : "Aesthetic procedures", url: localizedUrl("/procedures", locale) },
  ])
  const listJsonLd = itemListJsonLd({
    name: isAr ? "إجراءات التجميل على Med Aura" : "Aesthetic procedures on Med Aura",
    items: visibleGroups.flatMap((g) =>
      g.procedures.map((p) => ({
        name: isAr ? p.nameAr : p.nameEn,
        url: localizedUrl(`/procedures/${p.slug}`, locale),
        image: p.imageUrl ?? absoluteUrl(serviceImageForProcedure(p.slug, g.slug)),
      })),
    ),
  })

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([breadcrumb, listJsonLd]) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={isAr ? "دليل الإجراءات التجميلية" : "Your care guide"}
          title={isAr ? "استكشفي أحدث الإجراءات التجميلية الجراحية وغير الجراحية" : "Understand your options before choosing"}
          subtitle={isAr ? "دليل طبي شامل يوضح مدة التعافي، نوع التخدير، والنتائج المتوقعة لمساعدتكِ على اتخاذ القرار الأنسب لجمالكِ بثقة." : "Browse by area or procedure type, then review the essentials before comparing doctors."}
          imageSrc="/demo-services/service-face-neck.png"
          imageAlt={isAr ? "غرفة علاج تجميلي حديثة" : "Modern aesthetic treatment room"}
        />

        <section className="sticky top-16 z-30 border-b border-border/70 bg-background/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-6 lg:px-8">
            <form className="flex gap-2" method="get" role="search">
              {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={q}
                  aria-label={isAr ? "ابحث في الإجراءات" : "Search procedures"}
                  placeholder={isAr ? "ابحث باسم الإجراء أو الاحتياج" : "Search by procedure or need"}
                  className="ps-10"
                />
              </div>
              <Button type="submit" className="rounded-lg">
                <Search className="size-4" />
                <span className="hidden sm:inline">{isAr ? "بحث" : "Search"}</span>
              </Button>
              {(q || selectedCategory) && (
                <Button variant="ghost" className="rounded-lg" render={<Link href={localizedPath("/procedures", locale)} aria-label={isAr ? "مسح البحث" : "Clear search"}><X className="size-4" /></Link>} />
              )}
            </form>
            <nav aria-label={isAr ? "فئات الإجراءات" : "Procedure categories"} className="flex gap-2 overflow-x-auto pb-1">
              <Link href={localizedPath("/procedures", locale)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${!selectedCategory ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}>
                {isAr ? "الكل" : "All"}
              </Link>
              {allVisibleGroups.map((group) => (
                <Link
                  key={group.slug}
                  href={localizedPath(`/procedures?category=${group.slug}#group-${group.slug}`, locale)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${selectedCategory === group.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}
                >
                  {isAr ? group.nameAr : group.nameEn}
                  <span className="ms-1 opacity-70">{group.procedures.length}</span>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              {isAr ? `${total} إجراء متاح` : `${total} available ${total === 1 ? "procedure" : "procedures"}`}
            </p>
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
                locale={locale}
              />
            ) : total === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={isAr ? "لا توجد إجراءات مطابقة" : "No matching procedures"}
                description={isAr ? "جرّب اسمًا آخر أو اعرض جميع الفئات." : "Try another term or view all categories."}
              />
            ) : (
              visibleGroups
                .map((g) => (
                  <div key={g.slug} id={`group-${g.slug}`} className="scroll-mt-40">
                    <div className="mb-6 flex items-center gap-4">
                      <CategoryIconBadge icon={g.icon} className="size-14" iconClassName="size-7" />
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-foreground">
                          {isAr ? g.nameAr : g.nameEn}
                        </h2>
                        {(isAr ? g.descriptionAr : g.descriptionEn) && (
                          <p className="mt-1 text-muted-foreground">{isAr ? g.descriptionAr : g.descriptionEn}</p>
                        )}
                      </div>
                    </div>
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {g.procedures.map((p) => (
                        <StaggerItem key={p.slug}>
                          <Link
                            href={localizedPath(`/procedures/${p.slug}`, locale)}
                            className="group flex h-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-colors hover:border-primary/40"
                          >
                            <div className="relative h-32 overflow-hidden bg-muted">
                              <Image
                                src={p.imageUrl ?? serviceImageForProcedure(p.slug, g.slug)}
                                alt={isAr ? p.nameAr : p.nameEn}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                              <div className="absolute bottom-3 right-3">
                                <CategoryIconBadge icon={g.icon} className="size-10 bg-white/92" iconClassName="size-5" />
                              </div>
                              <ArrowLeft className="absolute bottom-5 left-4 size-4 text-white transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-5">
                              <h3 className="font-heading text-lg font-bold text-foreground">
                                {isAr ? p.nameAr : p.nameEn}
                              </h3>
                              <Badge variant={p.isSurgical ? "secondary" : "outline"} className="w-fit">
                                <Syringe className="size-3" />
                                {p.isSurgical
                                  ? (isAr ? "جراحي" : "Surgical")
                                  : (isAr ? "غير جراحي" : "Non-surgical")}
                              </Badge>
                              {(isAr ? p.descriptionAr : p.descriptionEn) && (
                                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                  {isAr ? p.descriptionAr : p.descriptionEn}
                                </p>
                              )}
                              <p className="mt-auto border-t border-border/60 pt-3 text-sm text-muted-foreground">
                                {formatRecoveryDays(p.recoveryDays, locale)}
                              </p>
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                                {isAr ? "التفاصيل والأطباء" : "Details and doctors"}
                                <ArrowLeft className="size-4 ltr:rotate-180" />
                              </span>
                            </div>
                          </Link>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </div>
                ))
            )}
          </div>
        </section>
        <SeoEditorialBand
          eyebrow={isAr ? "معلومة أوضح قبل الاستشارة" : "Clarity before consultation"}
          title={isAr ? "اختيار الإجراء يبدأ بفهم الهدف والبدائل" : "Choosing a procedure starts with goals and alternatives"}
          intro={isAr ? "تقدّم صفحات Med Aura تعريفًا أوليًا يساعدك على تنظيم أسئلتك، بينما يحدد الطبيب الملاءمة الطبية بعد معرفة تاريخك الصحي وفحص الحالة." : "Med Aura procedure pages provide an initial overview to organize your questions, while a clinician determines medical suitability after reviewing your health and condition."}
          items={isAr ? [
            { title: "الوجه والرقبة", body: "تعرّف على تجميل الأنف وشد الوجه والجفون والرقبة والذقن، ثم قارن الخبرة المرتبطة بكل إجراء." },
            { title: "الجسم والبشرة والشعر", body: "استكشف نحت الجسم والعناية بالبشرة والإجراءات غير الجراحية وزراعة الشعر مع توقعات تعافٍ أكثر وضوحًا." },
            { title: "الأسنان والابتسامة", body: "قارن خيارات الفينير والتبييض وتصميم الابتسامة واسأل عن صحة الفم والبدائل ومدة النتيجة." },
          ] : [
            { title: "Face and neck", body: "Learn about rhinoplasty, face, eyelid, neck, and chin procedures, then compare relevant experience." },
            { title: "Body, skin, and hair", body: "Explore body contouring, skin care, non-surgical treatments, and hair restoration with clearer recovery expectations." },
            { title: "Teeth and smile", body: "Compare veneers, whitening, and smile design while asking about oral health, alternatives, and longevity." },
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
