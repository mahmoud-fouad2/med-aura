import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Clock,
  Globe2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Tag,
  Calendar,
  ChevronRight,
  ShieldAlert,
} from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Stagger, StaggerItem } from "@/components/motion"
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"
import {
  buildPageMetadata,
  breadcrumbJsonLd,
  jsonLdScript,
  absoluteUrl,
  localizedUrl,
} from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [art, { locale }] = await Promise.all([getArticleBySlug(slug), getI18n()])

  if (!art) return {}

  const isAr = locale === "ar"
  const rawTitle = isAr ? (art.seoTitleAr ?? art.titleAr) : (art.seoTitleEn ?? art.titleEn)
  const title = rawTitle.replace(/\s*[|\-–—]\s*Med Aura\s*$/i, "").trim()
  const description = isAr
    ? (art.seoDescriptionAr ?? art.excerptAr)
    : (art.seoDescriptionEn ?? art.excerptEn)

  return buildPageMetadata({
    title,
    description,
    path: `/blog/${slug}`,
    image: art.coverImage,
    locale,
    type: "article",
    keywords: art.tags,
  })
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [art, { locale }] = await Promise.all([getArticleBySlug(slug), getI18n()])

  if (!art || !art.published) notFound()

  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  const title = isAr ? art.titleAr : art.titleEn
  const excerpt = isAr ? art.excerptAr : art.excerptEn
  const content = isAr ? art.contentAr : art.contentEn
  const author = isAr ? art.authorNameAr : art.authorNameEn
  const publishDate = new Date(art.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const related = await getRelatedArticles(slug, art.category, art.countryCode, 3)

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "Med Aura",
      logo: { "@type": "ImageObject", url: absoluteUrl("/brand/med-aura-logo.png") },
    },
    datePublished: art.createdAt.toISOString(),
    dateModified: art.updatedAt.toISOString(),
    image: absoluteUrl(art.coverImage),
    url: localizedUrl(`/blog/${slug}`, locale),
    inLanguage: locale === "ar" ? "ar-SA" : "en-US",
    keywords: art.tags.join(", "),
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: l("الرئيسية", "Home"), url: localizedUrl("/", locale) },
    { name: l("المدونة", "Blog"), url: localizedUrl("/blog", locale) },
    { name: title, url: localizedUrl(`/blog/${slug}`, locale) },
  ])

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([articleJsonLd, breadcrumb]) }}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-border/70 from-secondary/30 to-background relative isolate overflow-hidden border-b bg-gradient-to-b">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            {/* Breadcrumb */}
            <nav
              aria-label="breadcrumb"
              className="text-muted-foreground mb-6 flex items-center gap-1 text-xs"
            >
              <Link
                href={localizedPath("/", locale)}
                className="hover:text-foreground transition-colors"
              >
                {l("الرئيسية", "Home")}
              </Link>
              <ChevronRight className="text-muted-foreground/50 size-3 rtl:rotate-180" />
              <Link
                href={localizedPath("/blog", locale)}
                className="hover:text-foreground transition-colors"
              >
                {l("المدونة", "Blog")}
              </Link>
              <ChevronRight className="text-muted-foreground/50 size-3 rtl:rotate-180" />
              <span className="text-foreground/70 max-w-[200px] truncate">{title}</span>
            </nav>

            {/* Meta badges */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {art.countryCode && (
                <Badge variant="outline" className="gap-1 font-mono font-bold">
                  <Globe2 className="text-primary size-3" />
                  {art.countryCode}
                </Badge>
              )}
              <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <Clock className="size-3.5" />
                {art.readTimeMinutes} {l("دقائق قراءة", "min read")}
              </span>
              <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <Calendar className="size-3.5" />
                {publishDate}
              </span>
            </div>

            <h1 className="font-heading text-foreground text-2xl leading-snug font-extrabold sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
              {excerpt}
            </p>

            {/* Author */}
            <div className="mt-8 flex items-center gap-3">
              <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                <BookOpen className="text-primary size-5" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">{author}</p>
                <p className="text-muted-foreground text-xs">
                  {l("تحرير Med Aura", "Med Aura Editorial")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cover image */}
        <div className="relative mx-auto -mt-2 mb-0 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="border-border/60 relative aspect-[16/7] w-full overflow-hidden rounded-2xl border shadow-xl">
            <Image
              src={art.coverImage}
              alt={title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          </div>
        </div>

        {/* Article body + sidebar */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
            {/* Main content */}
            <div>
              <article className="max-w-none" dir={isAr ? "rtl" : "ltr"}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="border-border/80 mt-6 overflow-x-auto rounded-lg border">
                        <table className="w-full text-start text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="border-border bg-muted/40 text-muted-foreground border-b text-xs font-semibold">
                        {children}
                      </thead>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-border/70 border-b last:border-0">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="text-foreground p-3 text-start font-bold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="text-foreground/85 p-3 align-top">{children}</td>
                    ),
                    h2: ({ children }) => (
                      <h2 className="font-heading text-foreground mt-10 text-2xl font-bold first:mt-0 sm:text-3xl">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="font-heading text-foreground mt-8 text-xl font-bold">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-foreground/85 mt-4 text-base leading-8">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-foreground font-bold">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="border-primary/25 mt-5 space-y-3 border-s-2 ps-5">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="marker:text-primary mt-5 list-decimal space-y-3 ps-5 marker:font-bold">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground/85 leading-8">{children}</li>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        className="text-primary font-semibold underline underline-offset-2"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
              <aside className="border-warning/30 bg-warning/8 text-foreground/80 mt-10 flex gap-3 rounded-lg border p-5 text-sm leading-7">
                <ShieldAlert className="text-warning mt-1 size-5 shrink-0" aria-hidden="true" />
                <p>
                  {l(
                    "هذا الدليل للتثقيف العام ولا يشخّص حالة أو يحدد ملاءمة إجراء. ناقش تاريخك الصحي والمخاطر والبدائل وخطة المتابعة مع طبيب مؤهل.",
                    "This guide is for general education and does not diagnose a condition or determine treatment suitability. Discuss your health history, risks, alternatives, and follow-up plan with a qualified clinician.",
                  )}
                </p>
              </aside>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Tags */}
              {art.tags.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-heading text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Tag className="text-primary size-4" />
                    {l("الوسوم", "Tags")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {art.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-primary/8 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* CTA */}
              <Card className="from-primary/8 to-primary/3 border-primary/20 overflow-hidden bg-gradient-to-br p-0">
                <div className="p-5">
                  <h3 className="font-heading text-foreground mb-2 text-sm font-bold">
                    {l(
                      "هل أنت مستعد لبدء رحلتك التجميلية؟",
                      "Ready to start your aesthetic journey?",
                    )}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-xs">
                    {l(
                      "تواصل مع استشاريي Med Aura المعتمدين وابدأ رحلتك بخطوة موثوقة.",
                      "Connect with Med Aura certified specialists and take your first confident step.",
                    )}
                  </p>
                  <Link
                    href={localizedPath("/doctors", locale)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
                  >
                    <span>{l("استشر طبيباً الآن", "Consult a Specialist")}</span>
                    <ArrowIcon className="size-4" />
                  </Link>
                </div>
              </Card>

              {/* Related */}
              {related.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-heading text-foreground mb-4 text-sm font-semibold">
                    {l("مقالات ذات صلة", "Related guides")}
                  </h3>
                  <div className="space-y-3">
                    {related.map((rel) => (
                      <Link
                        key={rel.id}
                        href={localizedPath(`/blog/${rel.slug}`, locale)}
                        className="group flex items-start gap-3"
                      >
                        <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={rel.coverImage}
                            alt={isAr ? rel.titleAr : rel.titleEn}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="48px"
                          />
                        </div>
                        <p className="text-muted-foreground group-hover:text-foreground line-clamp-3 text-xs leading-relaxed font-medium transition-colors">
                          {isAr ? rel.titleAr : rel.titleEn}
                        </p>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
