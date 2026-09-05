import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowLeft, Clock, Globe2, Sparkles } from "lucide-react"
import { Stagger, StaggerItem } from "@/components/motion"
import { SectionHeading } from "@/components/ui/section-heading"
import { getFeaturedArticles } from "@/lib/data/articles"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"

export async function FeaturedArticles() {
  const [articles, { locale }] = await Promise.all([getFeaturedArticles(4), getI18n()])

  if (articles.length === 0) return null

  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const [hero, ...rest] = articles

  return (
    <section className="border-b border-border bg-gradient-to-b from-background to-secondary/20 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={l("المدونة التثقيفية", "Medical Editorial")}
            title={l("أدلة وأبحاث لقرارك التجميلي", "Expert Guides for Your Aesthetic Journey")}
            subtitle={l(
              "مقالات متعمقة أعدها استشاريون طبيون لمساعدتك على اتخاذ قرار واعٍ ومدروس",
              "In-depth clinical articles by specialist advisors to help you choose with confidence"
            )}
            align="start"
          />
          <Link
            href={localizedPath("/blog", locale)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <span>{l("جميع المقالات", "All articles")}</span>
            <ArrowIcon className="size-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Hero card */}
          {hero && (
            <Link
              href={localizedPath(`/blog/${hero.slug}`, locale)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg lg:row-span-2"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={hero.coverImage}
                  alt={isAr ? hero.titleAr : hero.titleEn}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {hero.countryCode && (
                  <span className="absolute start-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold font-mono text-foreground backdrop-blur-md">
                    <Globe2 className="size-3 text-primary" />
                    {hero.countryCode}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    <Sparkles className="size-3" />
                    {l("مقال مميز", "Featured")}
                  </span>
                  <h2 className="font-heading text-xl font-bold text-white leading-snug line-clamp-3">
                    {isAr ? hero.titleAr : hero.titleEn}
                  </h2>
                  <p className="mt-2 text-sm text-white/75 line-clamp-2">
                    {isAr ? hero.excerptAr : hero.excerptEn}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
                    <Clock className="size-3.5" />
                    <span>{hero.readTimeMinutes} {l("دقائق قراءة", "min read")}</span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Side cards */}
          <Stagger className="flex flex-col gap-6">
            {rest.map((art) => (
              <StaggerItem key={art.id}>
                <Link
                  href={localizedPath(`/blog/${art.slug}`, locale)}
                  className="group flex items-stretch gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={art.coverImage}
                      alt={isAr ? art.titleAr : art.titleEn}
                      fill
                      className="object-cover transition-transform duration-400 group-hover:scale-110"
                      sizes="96px"
                    />
                    {art.countryCode && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-bold font-mono text-white">
                        {art.countryCode}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-heading text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {isAr ? art.titleAr : art.titleEn}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {isAr ? art.excerptAr : art.excerptEn}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {art.readTimeMinutes} {l("د", "min")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary font-medium">
                        {l("اقرأ المقال", "Read guide")}
                        <ArrowIcon className="size-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}
