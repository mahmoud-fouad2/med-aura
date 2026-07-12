import Link from "next/link"
import Image from "next/image"
import { Globe2, MapPin, Users, Building2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { listDestinations } from "@/lib/data/destinations"
import { query } from "@/lib/db/query"
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, itemListJsonLd } from "@/lib/seo"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "الوجهات التجميلية",
  description:
    "استكشف الدول التي تضم أطباء ومراكز تجميل معتمدة على Med Aura، وقارن الوجهات حسب المدن والخدمات المتاحة.",
  path: "/destinations",
  image: "/demo-services/aesthetic-clinic-lounge.png",
})

export default async function DestinationsPage() {
  const res = await query(() => listDestinations())
  const destinations = res.status === "ok" ? res.data : []
  const doctorsTotal = destinations.reduce((sum, d) => sum + d.approvedDoctors, 0)
  const centersTotal = destinations.reduce((sum, d) => sum + d.approvedCenters, 0)
  const structuredData = [
    breadcrumbJsonLd([
      { name: "الرئيسية", url: absoluteUrl("/") },
      { name: "الوجهات", url: absoluteUrl("/destinations") },
    ]),
    itemListJsonLd({
      name: "الوجهات التجميلية على Med Aura",
      items: destinations.map((d) => ({
        name: d.nameAr,
        url: absoluteUrl(`/destinations/${d.code.toLowerCase()}`),
        image: absoluteUrl("/demo-services/aesthetic-clinic-lounge.png"),
      })),
    }),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الوجهات"
          title="اختر وجهتك التجميلية بوضوح"
          subtitle="قارن بين الدول المتاحة حسب الأطباء والمراكز واللغات، ثم ابدأ من الوجهة التي تناسب خطتك وميزانيتك."
          imageSrc="/demo-services/aesthetic-clinic-lounge.png"
          imageAlt="عيادة تجميل حديثة"
          stats={[
            { label: "وجهات", value: destinations.length.toLocaleString("ar-SA-u-nu-latn") },
            { label: "أطباء", value: doctorsTotal.toLocaleString("ar-SA-u-nu-latn") },
            { label: "مراكز", value: centersTotal.toLocaleString("ar-SA-u-nu-latn") },
          ]}
        />

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : destinations.length === 0 ? (
              <EmptyState
                icon={Globe2}
                title="لا توجد وجهات منشورة بعد"
                description="ستظهر الوجهات هنا فور اعتماد أطباء ومراكز فيها."
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destinations.map((d) => {
                  const inactive = d.approvedDoctors + d.approvedCenters === 0
                  return (
                    <StaggerItem key={d.code}>
                      <Link
                        href={`/destinations/${d.code.toLowerCase()}`}
                        aria-disabled={inactive}
                        className={inactive ? "pointer-events-none" : ""}
                      >
                        <Card
                          className={
                            "h-full overflow-hidden p-0 transition-all duration-300 " +
                            (inactive
                              ? "opacity-60"
                              : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant")
                          }
                        >
                          <div className="relative h-32 bg-muted">
                            <Image
                              src="/demo-services/aesthetic-clinic-lounge.png"
                              alt=""
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                            <span className="absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-2xl bg-white/92 text-primary ring-1 ring-white/50 shadow-elegant backdrop-blur">
                              <MapPin className="size-6" />
                            </span>
                            <span
                              dir="ltr"
                              className="absolute left-3 top-3 rounded-full bg-white/88 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-sm backdrop-blur"
                            >
                              {d.code}
                            </span>
                          </div>
                          <div className="p-6">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {d.nameAr}
                            </h3>
                            <p dir="ltr" className="text-right text-xs text-muted-foreground">
                              {d.nameEn}
                            </p>
                            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                              <Stat icon={Users} value={d.approvedDoctors} label="طبيب" />
                              <Stat icon={Building2} value={d.approvedCenters} label="مركز" />
                              <Stat icon={Globe2} value={d.citiesCount} label="مدينة" />
                            </dl>
                            {d.languagesTop.length > 0 && (
                              <p className="mt-4 flex flex-wrap gap-1 text-xs text-muted-foreground">
                                اللغات:
                                {d.languagesTop.map((l) => (
                                  <span
                                    key={l}
                                    className="rounded-full bg-muted px-2 py-0.5 font-medium"
                                  >
                                    {l}
                                  </span>
                                ))}
                              </p>
                            )}
                            {inactive && (
                              <p className="mt-4 text-xs text-muted-foreground">
                                لا يوجد مقدّم خدمة معتمد بعد
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 p-2">
      <Icon className="size-4 text-primary" />
      <span className="font-heading text-lg font-bold text-foreground">
        {value.toLocaleString("ar-SA-u-nu-latn")}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
