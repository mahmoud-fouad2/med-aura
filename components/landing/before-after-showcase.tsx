import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Button } from "@/components/ui/button"
import { BeforeAfterGalleryCard } from "@/components/before-after/gallery-card"
import { Stagger, StaggerItem } from "@/components/motion"
import { listPublicBeforeAfter } from "@/lib/data/before-after"
import { query } from "@/lib/db/query"
import { getI18n } from "@/lib/i18n"

/**
 * Homepage showcase of real, moderation-approved before/after cases. Renders
 * nothing when there are zero approved+consented entries — this is a trust
 * accent, not core page content, so it degrades the same way the CTA
 * footer's avatar cluster does rather than showing an empty-state block.
 */
export async function BeforeAfterShowcase() {
  const [res, { locale }] = await Promise.all([
    query(() => listPublicBeforeAfter({ limit: 3 })),
    getI18n(),
  ])
  const items = res.status === "ok" ? res.data : []
  if (items.length === 0) return null
  const isAr = locale === "ar"

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="start"
            eyebrow={isAr ? "نتائج حقيقية" : "Real Results"}
            title={isAr ? "نتائج قبل وبعد" : "Before & After Results"}
            subtitle={
              isAr
                ? "نتائج حقيقية لمرضى Med Aura، بموافقتهم على النشر."
                : "Real Med Aura patient results, published with their consent."
            }
          />
          <Button
            variant="outline"
            render={
              <Link href="/before-after">
                {isAr ? "عرض كل النتائج" : "View all results"}
                <ArrowLeft className="size-4 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover/button:-translate-x-1 ltr:group-hover/button:translate-x-1" />
              </Link>
            }
          />
        </div>

        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.id}>
              <BeforeAfterGalleryCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {isAr
            ? "النتائج تختلف من شخص لآخر وتعتمد على الحالة والاستجابة للعلاج."
            : "Results vary by individual and depend on condition and response to treatment."}
        </p>
      </div>
    </section>
  )
}
