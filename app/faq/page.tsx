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

        <section className="bg-background relative overflow-hidden">
          <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 translate-y-1/3 translate-x-1/3 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 relative z-10">
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
              <div className="space-y-4">
                {items.map((item, i) => (
                  <Reveal key={item.id} delay={i * 0.05}>
                    <details className="group rounded-2xl border border-border/80 bg-card/95 backdrop-blur-sm shadow-sm transition-all hover:border-primary/40 hover:shadow-elegant">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-5 font-heading font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                        {item.question}
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <ChevronDown className="size-5 transition-transform duration-300 group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="px-6 pb-6 pt-1 text-base leading-relaxed text-muted-foreground">
                        {item.answer}
                      </div>
                    </details>
                  </Reveal>
                ))}
              </div>
            )}

            <Reveal delay={0.2}>
              <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-border/80 bg-secondary/30 p-10 text-center shadow-sm">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HelpCircle className="size-7" />
                </span>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  {l("لم تجد إجابة لسؤالك؟", "Didn't find your answer?")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {l("نحن هنا لمساعدتك والإجابة على أي استفسارات إضافية لديك.", "We are here to help and answer any additional questions you may have.")}
                </p>
                <Button render={<Link href="/contact">{l("تواصل معنا", "Contact us")}</Link>} size="lg" className="rounded-full px-8" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
