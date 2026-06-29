import Link from "next/link"
import { ChevronDown, HelpCircle } from "lucide-react"
import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { faq } from "@/lib/db/schema"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/motion"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "الأسئلة الشائعة",
  description: "إجابات عن أكثر الأسئلة شيوعًا حول منصة Med Aura وخدماتها.",
}

export default async function FaqPage() {
  const items = await db
    .select({
      id: faq.id,
      question: faq.questionAr,
      answer: faq.answerAr,
    })
    .from(faq)
    .where(eq(faq.visible, true))
    .orderBy(asc(faq.sortOrder))

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الأسئلة الشائعة"
          title="إجابات لأسئلتك"
          subtitle="جمعنا أكثر الأسئلة شيوعًا حول المنصة. لم تجد إجابتك؟ تواصل معنا."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
            {items.length === 0 ? (
              <EmptyState
                icon={HelpCircle}
                title="سيتم نشر الأسئلة قريبًا"
                description="تُدار الأسئلة الشائعة من لوحة الإدارة وتظهر فور إضافتها."
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Reveal key={item.id}>
                    <details className="group rounded-2xl border border-border bg-card p-1 transition-colors hover:border-primary/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-heading font-semibold text-foreground [&::-webkit-details-marker]:hidden">
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
