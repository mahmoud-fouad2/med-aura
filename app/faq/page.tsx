import Link from "next/link"
import { ChevronDown, HelpCircle } from "lucide-react"
import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { query } from "@/lib/db/query"
import { DataState } from "@/components/ui/data-state"
import { faq } from "@/lib/db/schema"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/motion"
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, faqPageJsonLd, jsonLdScript } from "@/lib/seo"
import { PUBLIC_MEDIA } from "@/lib/public-media"
import { getI18n } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "الأسئلة الشائعة" : "Frequently asked questions",
    description: locale === "ar"
      ? "إجابات عن أكثر الأسئلة شيوعًا حول Med Aura."
      : "Answers to common questions about consultations, privacy, payments, and providers on Med Aura.",
    path: "/faq",
    image: PUBLIC_MEDIA.faq,
    locale,
  })
}

export default async function FaqPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const res = await query(() =>
    db
      .select({
        id: faq.id,
        questionAr: faq.questionAr,
        answerAr: faq.answerAr,
        questionEn: faq.questionEn,
        answerEn: faq.answerEn,
      })
      .from(faq)
      .where(eq(faq.visible, true))
      .orderBy(asc(faq.sortOrder)),
  )
  const items = res.status === "ok"
    ? res.data.map((item) => ({
        id: item.id,
        question: isAr ? item.questionAr : (item.questionEn ?? item.questionAr),
        answer: isAr ? item.answerAr : (item.answerEn ?? item.answerAr),
      }))
    : []

  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: absoluteUrl("/") },
      { name: l("الأسئلة الشائعة", "Frequently asked questions"), url: absoluteUrl("/faq") },
    ]),
    ...(items.length > 0 ? [faqPageJsonLd(items.map((i) => ({ question: i.question, answer: i.answer })))] : []),
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
          eyebrow={l("الأسئلة الشائعة", "FAQ")}
          title={l("إجابات لأسئلتك", "Answers to common questions")}
          subtitle={l("جمعنا أكثر الأسئلة شيوعًا حول المنصة. لم تجد إجابتك؟ تواصل معنا.", "Find clear answers about consultations, privacy, payments, and joining the platform.")}
          imageSrc={PUBLIC_MEDIA.faq}
          imageAlt={l("استشارة عناية بالبشرة", "Aesthetic care consultation")}
        />

        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={HelpCircle}
                title={l("سيتم نشر الأسئلة قريبًا", "Questions will be published soon")}
                description={l("نحضّر إجابات مختصرة وواضحة للأسئلة الأكثر تكرارًا.", "We are preparing concise answers to the most common questions.")}
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Reveal key={item.id}>
                    <details className="group rounded-lg border border-border bg-card p-1 transition-colors hover:border-primary/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 font-heading font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                      </summary>
                      <div className="px-5 pb-5 pt-1 leading-loose text-muted-foreground">
                        {item.answer}
                      </div>
                    </details>
                  </Reveal>
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
              <p className="text-foreground">لم تجد إجابة لسؤالك؟</p>
              <Button render={<Link href="/contact">تواصل معنا</Link>} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
