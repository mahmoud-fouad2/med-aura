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
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, itemListJsonLd, jsonLdScript, localizedUrl } from "@/lib/seo"
import { destinationImage, PUBLIC_MEDIA } from "@/lib/public-media"
import { getI18n, localizedPath } from "@/lib/i18n"
import { SeoEditorialBand } from "@/components/marketing/seo-editorial-band"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "وجهات السياحة العلاجية والتجميلية" : "Medical and aesthetic travel destinations",
    description: locale === "ar"
      ? "قارن وجهات التجميل حسب الأطباء والمراكز والمدن واللغات، وخطط للسفر والمتابعة قبل حجز الإجراء."
      : "Compare aesthetic travel destinations by doctors, clinics, cities, and languages, then plan travel and follow-up before booking.",
    path: "/destinations",
    image: PUBLIC_MEDIA.destinations,
    locale,
    keywords: locale === "ar" ? ["السياحة العلاجية", "وجهات التجميل", "تجميل في تركيا", "مراكز تجميل الخليج"] : ["medical tourism", "aesthetic travel", "cosmetic surgery in Türkiye", "Gulf aesthetic clinics"],
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
  const activeDestinations = destinations.filter(
    (destination) => destination.approvedDoctors + destination.approvedCenters > 0,
  )
  const doctorsTotal = activeDestinations.reduce((sum, d) => sum + d.approvedDoctors, 0)
  const centersTotal = activeDestinations.reduce((sum, d) => sum + d.approvedCenters, 0)
  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: localizedUrl("/", locale) },
      { name: l("الوجهات", "Destinations"), url: localizedUrl("/destinations", locale) },
    ]),
    itemListJsonLd({
      name: l("الوجهات التجميلية على Med Aura", "Aesthetic destinations on Med Aura"),
      items: activeDestinations.map((d) => ({
        name: isAr ? d.nameAr : d.nameEn,
        url: localizedUrl(`/destinations/${d.code.toLowerCase()}`, locale),
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
          title={l("قارني وجهات التجميل بخطوات أوضح", "Compare aesthetic destinations clearly")}
          subtitle={l("تظهر هنا الوجهات التي تضم أطباء أو مراكز منشورة، مع معلومات تساعدكِ على مقارنة الموقع والخدمات واللغات المتاحة.", "Only destinations with published doctors or centers appear here, with details to compare location, services, and languages.")}
          imageSrc={PUBLIC_MEDIA.destinations}
          imageAlt={l("عيادة تجميل حديثة", "Modern aesthetic clinic")}
          stats={[
            { label: l("وجهات متاحة", "Available destinations"), value: activeDestinations.length.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
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
                locale={locale}
              />
            ) : activeDestinations.length === 0 ? (
              <EmptyState
                icon={Globe2}
                title={l("نعمل على إطلاق أولى الوجهات", "The first destinations are being prepared")}
                description={l("ستظهر الوجهة عندما يُنشر فيها طبيب أو مركز بعد مراجعة بياناته المهنية.", "A destination appears when a doctor or center there is published after professional review.")}
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activeDestinations.map((d) => {
                  return (
                    <StaggerItem key={d.code}>
                      <Link
                        href={localizedPath(`/destinations/${d.code.toLowerCase()}`, locale)}
                      >
                        <Card
                          className="h-full overflow-hidden p-0 rounded-2xl border border-border/80 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
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
        <SeoEditorialBand
          eyebrow={l("رعاية تتجاوز تذكرة السفر", "Care beyond the flight")}
          title={l("قارن الرحلة كاملة، لا سعر الإجراء وحده", "Compare the whole care journey, not only the procedure price")}
          intro={l("عند التفكير في إجراء خارج بلد الإقامة، أدخل مدة الإقامة والفحوصات والتنقل والمتابعة واحتمال المراجعة الطبية ضمن المقارنة.", "When considering treatment away from home, include stay length, tests, transport, follow-up, and the possibility of an additional clinical review in your comparison.")}
          items={isAr ? [
            { title: "قبل السفر", body: "شارك تاريخك الصحي واسأل عن الفحوصات والمدة المناسبة للوصول قبل الإجراء." },
            { title: "خلال الإقامة", body: "اعرف جهة التواصل وخطة النقل والأدوية ومواعيد المراجعة قبل العودة." },
            { title: "بعد العودة", body: "اتفق على طريقة المتابعة عن بُعد وما يتطلب مراجعة محلية أو عودة للمركز." },
          ] : [
            { title: "Before travel", body: "Share your health history and ask about tests and the appropriate arrival time before treatment." },
            { title: "During your stay", body: "Know your contact, transport plan, medication, and review dates before returning home." },
            { title: "After returning", body: "Agree on remote follow-up and what would require a local review or return to the clinic." },
          ]}
        />
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
