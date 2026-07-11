import Link from "next/link"
import { ImageOff, ChevronLeft } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { Stagger, StaggerItem } from "@/components/motion"
import { listPublicBeforeAfter } from "@/lib/data/before-after"
import { listProceduresGrouped } from "@/lib/data/procedures"
import { BeforeAfterGalleryCard } from "@/components/before-after/gallery-card"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "قبل وبعد",
  description:
    "معرض حالات تجميلية موافق عليها بموجب موافقة موثقة من المرضى، من أطباء ومراكز معتمدين على Med Aura.",
}


export default async function BeforeAfterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const procedureSlug = firstParam(sp.procedure)

  const [items, categories] = await Promise.all([
    listPublicBeforeAfter({ procedureSlug, limit: 60 }),
    listProceduresGrouped(),
  ])

  const proceduresFlat = categories.flatMap((c) =>
    c.procedures.map((p) => ({ slug: p.slug, nameAr: p.nameAr })),
  )

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="قبل وبعد"
          title="حالات موثقة بموافقة المرضى"
          subtitle="ننشر هذه الحالات فقط بعد الحصول على موافقة موثقة من المريض، ومراجعة فريق المراجعة والاعتماد للتأكد من عدم الكشف عن أي بيانات شخصية."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
            <Card className="p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                تصفية حسب الإجراء
              </p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={!procedureSlug}
                  href="/before-after"
                  label="الكل"
                />
                {proceduresFlat.slice(0, 24).map((p) => (
                  <FilterChip
                    key={p.slug}
                    active={procedureSlug === p.slug}
                    href={`/before-after?procedure=${p.slug}`}
                    label={p.nameAr}
                  />
                ))}
              </div>
            </Card>

            {items.length === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="لا توجد حالات موافق عليها بعد"
                description="ننشر الحالات فقط بعد اكتمال المراجعة والموافقة. عد لاحقًا أو استكشف الأطباء المعتمدين."
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <StaggerItem key={item.id}>
                    <BeforeAfterGalleryCard item={item} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function FilterChip({
  active,
  href,
  label,
}: {
  active: boolean
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70")
      }
    >
      {label}
    </Link>
  )
}
