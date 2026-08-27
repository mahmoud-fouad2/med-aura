import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, Clock3, ShieldAlert } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { getBlogPost } from "@/lib/content/blog"
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
  const post = getBlogPost(slug, locale)
  if (!post) return { title: locale === "ar" ? "المقال غير موجود" : "Guide not found" }
  return buildPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    image: post.image,
    locale,
    type: "article",
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()])
  const post = getBlogPost(slug, locale)
  if (!post) notFound()
  const isAr = locale === "ar"
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: absoluteUrl(post.image),
    datePublished: post.publishedAt,
    dateModified: post.reviewedAt,
    inLanguage: locale,
    mainEntityOfPage: localizedUrl(`/blog/${post.slug}`, locale),
    author: { "@type": "Organization", name: isAr ? "فريق Med Aura التحريري" : "Med Aura Editorial Team" },
    publisher: { "@id": organizationJsonLd()["@id"] },
  }

  return (
    <div className="flex min-h-svh flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleSchema) }} />
      <SiteHeader />
      <main className="flex-1 bg-background">
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link href={localizedPath("/blog", locale)} className="inline-flex min-h-11 items-center text-sm font-bold text-primary hover:underline">
            {isAr ? "العودة إلى الأدلة" : "Back to guides"}
          </Link>

          <header className="mt-5">
            <p className="text-sm font-bold text-primary">{post.category}</p>
            <h1 className="font-heading mt-3 text-3xl font-bold leading-tight text-foreground sm:text-5xl">{post.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{post.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-border/70 py-4 text-sm text-muted-foreground">
              <span>{isAr ? "إعداد فريق Med Aura التحريري" : "By the Med Aura Editorial Team"}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{isAr ? "تمت المراجعة" : "Reviewed"} {new Date(post.reviewedAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US")}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{isAr ? `${post.readingMinutes} دقائق قراءة` : `${post.readingMinutes} min read`}</span>
            </div>
          </header>

          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg border border-border/80 bg-muted">
            <Image src={post.image} alt={post.title} fill priority className="object-cover" sizes="(max-width: 896px) 100vw, 896px" />
          </div>

          <div className="mt-10 space-y-10">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8 text-foreground/85">{paragraph}</p>)}
                {section.bullets && (
                  <ul className="mt-5 space-y-3 border-s-2 border-primary/25 ps-5">
                    {section.bullets.map((bullet) => <li key={bullet} className="leading-8 text-foreground/85">{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="mt-12 flex gap-3 rounded-lg border border-warning/30 bg-warning/8 p-5 text-sm leading-7 text-foreground/80">
            <ShieldAlert className="mt-1 size-5 shrink-0 text-warning" />
            <p>{isAr ? "هذا الدليل للتثقيف العام ولا يشخّص حالة أو يحدد ملاءمة إجراء. ناقش تاريخك الصحي والمخاطر والبدائل وخطة المتابعة مع طبيب مؤهل." : "This guide is for general education and does not diagnose a condition or determine treatment suitability. Discuss your health history, risks, alternatives, and follow-up plan with a qualified clinician."}</p>
          </aside>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
