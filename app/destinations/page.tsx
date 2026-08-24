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
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, itemListJsonLd, jsonLdScript } from "@/lib/seo"
import { destinationImage, PUBLIC_MEDIA } from "@/lib/public-media"
import { getI18n } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "الوجهات التجميلية" : "Aesthetic destinations",
    description: locale === "ar"
      ? "قارن الوجهات حسب الأطباء والمراكز والمدن واللغات المتاحة."
      : "Compare destinations by available doctors, centers, cities, and languages.",
    path: "/destinations",
    image: PUBLIC_MEDIA.destinations,
    locale,
  })
}

export default async function DestinationsPage() {
  const [res, { locale }] = await Promise.all([
    query(() => listDestinations()),
    getI18n(),
  ])
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const destinations = res.status === "ok" ? res.data : []
  const doctorsTotal = destinations.reduce((sum, d) => sum + d.approvedDoctors, 0)
  const centersTotal = destinations.reduce((sum, d) => sum + d.approvedCenters, 0)
  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: absoluteUrl("/") },
      { name: l("الوجهات", "Destinations"), url: absoluteUrl("/destinations") },
    ]),
    itemListJsonLd({
      name: l("الوجهات التجميلية على Med Aura", "Aesthetic destinations on Med Aura"),
      items: destinations.map((d) => ({
        name: isAr ? d.nameAr : d.nameEn,
        url: absoluteUrl(`/destinations/${d.code.toLowerCase()}`),
        image: absoluteUrl(destinationImage(d.code)),
      })),
    }),
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
          eyebrow={l("الوجهات العلاجية", "Destinations")}
          title={l("وجهتكِ التجميلية المثالية بأعلى معايير الرعاية", "Compare aesthetic destinations clearly")}
          subtitle={l("استكشفي نخبة أطباء ومراكز التجميل المعتمدة عبر أبرز الوجهات في المملكة والخليج وتركيا، مع مقارنة شفافة للخبرات والأسعار.", "Compare destinations by available doctors, centers, and languages before choosing your next step.")}
          imageSrc={PUBLIC_MEDIA.destinations}
          imageAlt={l("عيادة تجميل حديثة", "Modern aesthetic clinic")}
          stats={[
            { label: l("وجهات معتمدة", "Destinations"), value: destinations.length.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
            { label: l("أطباء استشاريون", "Doctors"), value: doctorsTotal.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
            { label: l("مراكز ومستشفيات", "Centers"), value: centersTotal.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
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
                title={l("لا توجد وجهات منشورة بعد", "No destinations are available yet")}
                description={l("ستظهر الوجهات هنا فور اعتماد أطباء ومراكز فيها.", "Destinations appear after doctors and centers are approved there.")}
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
                            "h-full overflow-hidden p-0 rounded-2xl border border-border/80 bg-card transition-all duration-300 " +
                            (inactive
                              ? "opacity-60"
                              : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant")
                          }
                        >
                          <div className="relative h-36 bg-muted">
                            <Image
                              src={destinationImage(d.code)}
                              alt={l(`وجهة ${d.nameAr}`, `${d.nameEn} destination`)}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                            <span className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-xl bg-card/92 text-primary ring-1 ring-border/80 border border-primary/20 shadow-elegant backdrop-blur">
                              <MapPin className="size-5" />
                            </span>
                            <span
                              dir="ltr"
                              className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-sm backdrop-blur border border-border/70"
                            >
                              {d.code}
                            </span>
                          </div>
                          <div className="p-6">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {isAr ? d.nameAr : d.nameEn}
                            </h3>
                            <p dir="ltr" className="text-right text-xs text-muted-foreground">
                              {isAr ? d.nameEn : d.code}
                            </p>
                            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                              <Stat icon={Users} value={d.approvedDoctors} label={l("طبيب", "Doctors")} />
                              <Stat icon={Building2} value={d.approvedCenters} label={l("مركز", "Centers")} />
                              <Stat icon={Globe2} value={d.citiesCount} label={l("مدينة", "Cities")} />
                            </dl>
                            {d.languagesTop.length > 0 && (
                              <p className="mt-4 flex flex-wrap gap-1 text-xs text-muted-foreground">
                                {l("اللغات:", "Languages:")}
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
                                {l("لا يوجد مقدّم خدمة معتمد بعد", "No approved provider yet")}
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
