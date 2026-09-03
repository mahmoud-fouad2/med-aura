import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CalendarDays, Clock3, ShieldAlert, Globe2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"
import {
  absoluteUrl,
  buildPageMetadata,
  jsonLdScript,
  localizedUrl,
  organizationJsonLd,
} from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()])
  const art = await getArticleBySlug(slug)
  if (!art || !art.published) {
    return { title: locale === "ar" ? "المقال غير موجود" : "Guide not found" }
  }
  const isAr = locale === "ar"
  // Article SEO titles are sometimes authored with the site name already
  // appended (e.g. "... | Med Aura") — buildPageMetadata's own title
  // template adds it again, so strip a trailing brand suffix here rather
  // than showing it twice.
  const rawTitle = (isAr ? art.seoTitleAr : art.seoTitleEn) || (isAr ? art.titleAr : art.titleEn)
  const title = rawTitle.replace(/\s*[|\-–—]\s*Med Aura\s*$/i, "").trim()
  return buildPageMetadata({
    title,
    description: (isAr ? art.seoDescriptionAr : art.seoDescriptionEn) || (isAr ? art.excerptAr : art.excerptEn),
    path: `/blog/${art.slug}`,
    image: art.coverImage,
    locale,
    type: "article",
    keywords: art.tags,
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()])
  const art = await getArticleBySlug(slug)
  // Never leak an unpublished draft through its direct URL — same rule as
  // every other public content surface in this app.
  if (!art || !art.published) notFound()

  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const title = isAr ? art.titleAr : art.titleEn
  const excerpt = isAr ? art.excerptAr : art.excerptEn
  const content = isAr ? art.contentAr : art.contentEn
  const author = isAr ? art.authorNameAr : art.authorNameEn

  const related = await getRelatedArticles(art.slug, art.category, art.countryCode, 3)

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    image: absoluteUrl(art.coverImage),
    datePublished: art.createdAt.toISOString(),
    dateModified: art.updatedAt.toISOString(),
    inLanguage: locale,
    mainEntityOfPage: localizedUrl(`/blog/${art.slug}`, locale),
    author: { "@type": "Organization", name: author },
    publisher: { "@id": organizationJsonLd()["@id"] },
  }

  return (
    <div className="flex min-h-svh flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleSchema) }} />
      <SiteHeader />
      <main className="flex-1 bg-background">
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link href={localizedPath("/blog", locale)} className="inline-flex min-h-11 items-center text-sm font-bold text-primary hover:underline">
            {l("العودة إلى المدونة", "Back to the blog")}
          </Link>

          <header className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              {art.countryCode && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  <Globe2 className="size-3.5" />
                  {art.countryCode}
                </span>
              )}
            </div>
            <h1 className="font-heading mt-3 text-3xl font-bold leading-tight text-foreground sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-border/70 py-4 text-sm text-muted-foreground">
              <span>{l("إعداد", "By")} {author}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{l("تمت المراجعة", "Reviewed")} {art.updatedAt.toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{isAr ? `${art.readTimeMinutes} دقائق قراءة` : `${art.readTimeMinutes} min read`}</span>
            </div>
          </header>

          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg border border-border/80 bg-muted">
            <Image src={art.coverImage} alt={title} fill priority className="object-cover" sizes="(max-width: 896px) 100vw, 896px" />
          </div>

          <div className="mt-10 max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="mt-6 overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-start text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">{children}</thead>
                ),
                tr: ({ children }) => <tr className="border-b border-border/70 last:border-0">{children}</tr>,
                th: ({ children }) => <th className="p-3 text-start font-bold text-foreground">{children}</th>,
                td: ({ children }) => <td className="p-3 align-top text-foreground/85">{children}</td>,
                h2: ({ children }) => (
                  <h2 className="font-heading mt-10 text-2xl font-bold text-foreground sm:text-3xl first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-heading mt-8 text-xl font-bold text-foreground">{children}</h3>
                ),
                p: ({ children }) => <p className="mt-4 text-base leading-8 text-foreground/85">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                ul: ({ children }) => (
                  <ul className="mt-5 space-y-3 border-s-2 border-primary/25 ps-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mt-5 list-decimal space-y-3 ps-5 marker:font-bold marker:text-primary">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-8 text-foreground/85">{children}</li>,
                a: ({ href, children }) => (
                  <a href={href} className="font-semibold text-primary underline underline-offset-2">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          <aside className="mt-12 flex gap-3 rounded-lg border border-warning/30 bg-warning/8 p-5 text-sm leading-7 text-foreground/80">
            <ShieldAlert className="mt-1 size-5 shrink-0 text-warning" />
            <p>{l("هذا الدليل للتثقيف العام ولا يشخّص حالة أو يحدد ملاءمة إجراء. ناقش تاريخك الصحي والمخاطر والبدائل وخطة المتابعة مع طبيب مؤهل.", "This guide is for general education and does not diagnose a condition or determine treatment suitability. Discuss your health history, risks, alternatives, and follow-up plan with a qualified clinician.")}</p>
          </aside>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-heading text-xl font-bold text-foreground">{l("مقالات ذات صلة", "Related guides")}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <Card key={r.id} className="overflow-hidden border-border/80 p-0">
                    <Link href={localizedPath(`/blog/${r.slug}`, locale)} className="flex h-full flex-col">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <Image
                          src={r.coverImage}
                          alt={isAr ? r.titleAr : r.titleEn}
                          fill
                          loading="lazy"
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading text-sm font-bold leading-snug text-foreground line-clamp-2">
                          {isAr ? r.titleAr : r.titleEn}
                        </h3>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
