import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Clock3 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { buildPageMetadata } from "@/lib/seo"
import { getI18n } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"
import { listBlogPosts } from "@/lib/content/blog"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "دليل الإجراءات والعناية التجميلية" : "Aesthetic procedures and care guides",
    description: locale === "ar"
      ? "أدلة واضحة تساعدك على تجهيز أسئلتك حول تجميل الأنف وزراعة الشعر والبوتوكس والفيلر والتعافي، دون وعود أو بديل عن الاستشارة الطبية."
      : "Clear guides to help you prepare questions about rhinoplasty, hair restoration, fillers, botulinum toxin, and recovery without replacing medical advice.",
    path: "/blog",
    locale,
    type: "website",
  })
}

export default async function BlogIndexPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const posts = listBlogPosts(locale)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-section-soft">
        <header className="border-b border-border/70 bg-background">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="text-sm font-bold text-primary">{isAr ? "معرفة قبل القرار" : "Knowledge before a decision"}</p>
            <h1 className="font-heading mt-2 max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              {isAr ? "أدلة تساعدك على طرح أسئلة طبية أفضل" : "Guides that help you ask better medical questions"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              {isAr
                ? "معلومات تحريرية مبسطة عن الإجراءات والتعافي والمقارنة. نوضح ما يستحق السؤال، ولا نستبدل تقييم الطبيب لحالتك."
                : "Plain-language editorial information about procedures, recovery, and comparison. We clarify what to ask without replacing a clinician's assessment."}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Card key={post.slug} className="group h-full overflow-hidden border-border/80 p-0">
                <Link href={localizedPath(`/blog/${post.slug}`, locale)} className="flex h-full flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <span className="absolute start-4 top-4 rounded-md bg-background/94 px-3 py-1.5 text-xs font-bold text-primary shadow-sm backdrop-blur">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{new Date(post.reviewedAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US")}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{isAr ? `${post.readingMinutes} دقائق` : `${post.readingMinutes} min`}</span>
                    </div>
                    <h2 className="font-heading mt-4 text-xl font-bold leading-8 text-foreground transition-colors group-hover:text-primary">{post.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">{post.description}</p>
                    <span className="mt-auto pt-5 text-sm font-bold text-primary">{isAr ? "اقرأ الدليل" : "Read the guide"}</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
