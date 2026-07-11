import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Syringe, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { CategoryIconBadge } from "@/components/marketing/category-icon"
import { listProceduresGrouped } from "@/lib/data/procedures"
import { query } from "@/lib/db/query"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "إجراءات التجميل",
  description:
    "تصفّح إجراءات التجميل الجراحية وغير الجراحية على Med Aura، مصنّفة حسب المنطقة، وابدأ رحلتك مع طبيب معتمد.",
}

export default async function ProceduresPage() {
  const res = await query(() => listProceduresGrouped())
  const groups = res.status === "ok" ? res.data : []
  const hasAny = groups.some((g) => g.procedures.length > 0)
  const visibleGroups = groups.filter((g) => g.procedures.length > 0)
  const procedureCount = visibleGroups.reduce((sum, g) => sum + g.procedures.length, 0)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الإجراءات"
          title="اختَر الإجراء وأنت فاهم الخطوة"
          subtitle="استكشف الإجراءات الجراحية وغير الجراحية بصورة أوضح: ما طبيعتها، كم تحتاج للتعافي، ومن الأطباء المناسبين لها."
          imageSrc="/demo-services/aesthetic-treatment-room.png"
          imageAlt="غرفة علاج تجميلي حديثة"
          stats={[
            { label: "تصنيفات", value: visibleGroups.length.toLocaleString("ar-SA-u-nu-latn") },
            { label: "إجراءات", value: procedureCount.toLocaleString("ar-SA-u-nu-latn") },
            { label: "استشارة أولى", value: "واضحة" },
          ]}
        />

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : !hasAny ? (
              <EmptyState
                icon={Sparkles}
                title="سيتم عرض الإجراءات قريبًا"
                description="نحضّر قائمة الإجراءات بعناية لتظهر لك بشكل واضح ومفيد."
              />
            ) : (
              visibleGroups
                .map((g) => (
                  <div key={g.slug}>
                    <div className="mb-6 flex items-center gap-4">
                      <CategoryIconBadge icon={g.icon} className="size-14" iconClassName="size-7" />
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-foreground">
                          {g.nameAr}
                        </h2>
                        {g.descriptionAr && (
                          <p className="mt-1 text-muted-foreground">{g.descriptionAr}</p>
                        )}
                      </div>
                    </div>
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {g.procedures.map((p) => (
                        <StaggerItem key={p.slug}>
                          <Link
                            href={`/procedures/${p.slug}`}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                          >
                            <div className="relative h-32 overflow-hidden bg-muted">
                              <Image
                                src={procedureImageForCategory(g.slug)}
                                alt=""
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                              <div className="absolute bottom-3 right-3">
                                <CategoryIconBadge icon={g.icon} className="size-10 bg-white/92" iconClassName="size-5" />
                              </div>
                              <ArrowLeft className="absolute bottom-5 left-4 size-4 text-white transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-5">
                              <h3 className="font-heading text-lg font-bold text-foreground">
                                {p.nameAr}
                              </h3>
                              <Badge variant={p.isSurgical ? "secondary" : "outline"} className="w-fit">
                                <Syringe className="size-3" />
                                {p.isSurgical ? "جراحي" : "غير جراحي"}
                              </Badge>
                              <p className="mt-auto text-sm text-muted-foreground">
                                {p.recoveryDays != null && p.recoveryDays > 0
                                  ? `تعافٍ تقديري ${p.recoveryDays} يوم`
                                  : "عودة أسرع للروتين اليومي"}
                              </p>
                            </div>
                          </Link>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </div>
                ))
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function procedureImageForCategory(slug: string): string {
  if (slug === "dental" || slug === "hair") return "/demo-services/aesthetic-clinic-lounge.png"
  return "/demo-services/aesthetic-treatment-room.png"
}
