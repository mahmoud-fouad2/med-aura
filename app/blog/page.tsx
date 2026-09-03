import Link from "next/link"
import Image from "next/image"
import { BookOpen, Clock, Globe2, ArrowRight, ArrowLeft, Tag } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Stagger, StaggerItem } from "@/components/motion"
import { listPublishedArticles } from "@/lib/data/articles"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"
import { buildPageMetadata, breadcrumbJsonLd, itemListJsonLd, jsonLdScript, localizedUrl, absoluteUrl } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"

  return buildPageMetadata({
    title: isAr ? "دليل السياحة العلاجية والمدونة الطبية" : "Medical Tourism & Aesthetic Surgery Blog",
    description: isAr
      ? "مقالات استشارية وأدلة متخصصة في جراحات التجميل ونحت القوام وزراعة الشعر والسياحة العلاجية في السعودية والإمارات وتركيا ومصر والخليج."
      : "Expert clinical insights, surgical guides, and destination comparisons for aesthetic procedures across the GCC, Turkey, and worldwide.",
    path: "/blog",
    image: "/destinations/hero.jpg",
    locale,
    keywords: isAr
      ? ["مقالات تجميل", "تجميل الأنف تركيا", "نحت القوام دبي", "زراعة الشعر إسطنبول", "ابتسامة هوليوود القاهرة", "سياحة علاجية"]
      : ["aesthetic surgery blog", "rhinoplasty guide", "liposuction dubai", "hair transplant istanbul", "medical tourism guide"],
  })
}

const COUNTRIES = [
  { code: "ALL", labelAr: "جميع الوجهات", labelEn: "All Destinations" },
  { code: "SA", labelAr: "السعودية", labelEn: "Saudi Arabia" },
  { code: "AE", labelAr: "الإمارات", labelEn: "UAE" },
  { code: "TR", labelAr: "تركيا", labelEn: "Turkey" },
  { code: "EG", labelAr: "مصر", labelEn: "Egypt" },
  { code: "QA", labelAr: "قطر", labelEn: "Qatar" },
  { code: "JO", labelAr: "الأردن", labelEn: "Jordan" },
  { code: "BH", labelAr: "البحرين", labelEn: "Bahrain" },
  { code: "OM", labelAr: "عُمان", labelEn: "Oman" },
  { code: "LB", labelAr: "لبنان", labelEn: "Lebanon" },
]

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; category?: string }>
}) {
  const [{ locale }, params] = await Promise.all([getI18n(), searchParams])
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)

  const selectedCountry = params.country ?? "ALL"

  const { articles, total } = await listPublishedArticles({
    countryCode: selectedCountry !== "ALL" ? selectedCountry : undefined,
    category: params.category,
    limit: 30,
  })

  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: localizedUrl("/", locale) },
      { name: l("المدونة والمقالات", "Blog"), url: localizedUrl("/blog", locale) },
    ]),
    itemListJsonLd({
      name: l("مقالات وأدلة السياحة التجميلية", "Aesthetic Travel Guides & Articles"),
      items: articles.map((art) => ({
        name: isAr ? art.titleAr : art.titleEn,
        url: localizedUrl(`/blog/${art.slug}`, locale),
        image: absoluteUrl(art.coverImage),
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
      <main className="flex-1">
        <PageHero
          eyebrow={l("المدونة التثقيفية الطبية", "Medical & Aesthetic Editorial")}
          title={l("دليلك الموثق لقرارات التجميل والسياحة العلاجية", "Evidence-Based Aesthetic & Medical Travel Guides")}
          subtitle={l(
            "مقالات وأدلة جغرافية وسريرية أعدها نخبة من استشاريي التجميل لمساعدتك على اتخاذ قرار واعٍ ومدروس.",
            "Specialist surgical guides, destination comparisons, and clinical insights written to empower your aesthetic journey."
          )}
          imageSrc="/destinations/hero.jpg"
          imageAlt={l("صالة استشارات طبية دولية", "International Medical Consultation Suite")}
          stats={[
            { label: l("مقالات منشورة", "Published guides"), value: total.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
            { label: l("وجهات مغطاة", "Covered destinations"), value: "10" },
            { label: l("استشارات معتمدة", "Clinical review"), value: "100%" },
          ]}
        />

        <section className="bg-section-soft py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Country Filters */}
            <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-border/70 pb-6">
              <span className="me-2 text-xs font-semibold text-muted-foreground">
                {l("تصفح حسب الوجهة:", "Filter by destination:")}
              </span>
              {COUNTRIES.map((c) => {
                const isActive = selectedCountry === c.code
                const href = c.code === "ALL" ? localizedPath("/blog", locale) : localizedPath(`/blog?country=${c.code}`, locale)
                return (
                  <Link
                    key={c.code}
                    href={href}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isAr ? c.labelAr : c.labelEn}
                  </Link>
                )
              })}
            </div>

            {articles.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={l("لا توجد مقالات لهذه الوجهة حالياً", "No articles for this destination yet")}
                description={l("جرب اختيار وجهة أخرى أو تصفح جميع المقالات.", "Try selecting another destination or view all articles.")}
              />
            ) : (
              <Stagger className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((art) => {
                  const title = isAr ? art.titleAr : art.titleEn
                  const excerpt = isAr ? art.excerptAr : art.excerptEn
                  const author = isAr ? art.authorNameAr : art.authorNameEn
                  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

                  return (
                    <StaggerItem key={art.id}>
                      <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                        <Link
                          href={localizedPath(`/blog/${art.slug}`, locale)}
                          className="relative aspect-[16/10] w-full overflow-hidden bg-muted"
                        >
                          <Image
                            src={art.coverImage}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          {art.countryCode && (
                            <div className="absolute start-3 top-3">
                              <Badge className="bg-background/90 text-foreground backdrop-blur-md border border-border/60 font-mono font-bold shadow-sm">
                                <Globe2 className="size-3 me-1 text-primary" />
                                {art.countryCode}
                              </Badge>
                            </div>
                          )}
                        </Link>

                        <div className="flex flex-1 flex-col p-6">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Clock className="size-3.5" />
                            <span>{art.readTimeMinutes} {l("دقائق قراءة", "min read")}</span>
                          </div>

                          <h2 className="font-heading text-lg font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            <Link href={localizedPath(`/blog/${art.slug}`, locale)}>
                              {title}
                            </Link>
                          </h2>

                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground line-clamp-3 flex-1">
                            {excerpt}
                          </p>

                          <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
                            <span className="text-xs font-medium text-foreground/80 truncate max-w-[200px]">
                              {author}
                            </span>
                            <Link
                              href={localizedPath(`/blog/${art.slug}`, locale)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline"
                            >
                              <span>{l("اقرأ المقال", "Read guide")}</span>
                              <ArrowIcon className="size-3.5" />
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
