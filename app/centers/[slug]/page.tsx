import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Building2, MapPin, BadgeCheck, Languages as LangIcon, ChevronLeft } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Reveal } from "@/components/motion"
import { getCenterBySlug } from "@/lib/data/centers"
import { query } from "@/lib/db/query"
import { countryNameAr } from "@/lib/status-labels"
import { Stethoscope } from "lucide-react"
import { getI18n } from "@/lib/i18n"
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  geoCoordinatesJsonLd,
} from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { t } = await getI18n()
  const r = await query(() => getCenterBySlug(slug))
  const c = r.status === "ok" ? r.data : null
  if (!c) return { title: t.common.none }
  return buildPageMetadata({
    title: c.name,
    description:
      c.description ??
      `${c.name} على Med Aura: أطباء معتمدون، بيانات واضحة، وحجز استشارة تجميلية بثقة.`,
    path: `/centers/${c.slug}`,
    image: "/demo-services/aesthetic-clinic-lounge.png",
  })
}

export default async function CenterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { t }] = await Promise.all([
    params,
    getI18n(),
  ])
  const r = await query(() => getCenterBySlug(slug))
  if (r.status !== "ok") {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <DataState
            status={r.status}
            requestId={r.status === "error" ? r.requestId : undefined}
          />
        </main>
        <SiteFooter />
      </div>
    )
  }
  const c = r.data
  if (!c) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    image: absoluteUrl("/demo-services/aesthetic-clinic-lounge.png"),
    address: {
      "@type": "PostalAddress",
      ...(c.address ? { streetAddress: c.address } : {}),
      ...(c.city ? { addressLocality: c.city } : {}),
      addressCountry: countryNameAr(c.country) || c.country,
    },
    ...(geoCoordinatesJsonLd(c.country) ? { geo: geoCoordinatesJsonLd(c.country) } : {}),
    url: absoluteUrl(`/centers/${c.slug}`),
    medicalSpecialty: "Aesthetic Medicine",
    areaServed: {
      "@type": "Country",
      name: countryNameAr(c.country) || c.country,
    },
    ...(c.languages.length ? { knowsLanguage: c.languages } : {}),
    ...(c.doctors.length
      ? {
          employee: c.doctors.map((doctor) => ({
            "@type": "Physician",
            name: doctor.name,
            url: absoluteUrl(`/doctors/${doctor.slug}`),
            ...(doctor.photoUrl ? { image: absoluteUrl(doctor.photoUrl) } : {}),
          })),
        }
      : {}),
  }
  if (c.reviewCount > 0 && c.rating) {
    Object.assign(jsonLd, {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: c.rating,
        reviewCount: c.reviewCount,
        bestRating: "5",
        worstRating: "1",
      },
    })
  }
  const breadcrumb = breadcrumbJsonLd([
    { name: "الرئيسية", url: absoluteUrl("/") },
    { name: "المراكز", url: absoluteUrl("/centers") },
    { name: c.name, url: absoluteUrl(`/centers/${c.slug}`) },
  ])

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="absolute inset-0">
            <Image
              src="/demo-services/aesthetic-clinic-lounge.png"
              alt=""
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/94 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/centers" className="hover:text-primary">
                {t.nav.centers}
              </Link>
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
              <span className="text-foreground">{c.name}</span>
            </nav>
            <Reveal>
              <div className="flex items-start gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-card/85 text-primary shadow-elegant ring-1 ring-white/70 backdrop-blur-md">
                  <Building2 className="size-8" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                      {c.name}
                    </h1>
                    {c.verified && <BadgeCheck className="size-5 text-primary" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4" />
                      {[c.city, countryNameAr(c.country)].filter(Boolean).join("، ")}
                    </span>
                    {c.languages.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <LangIcon className="size-4" />
                        {c.languages.join("، ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {c.description && (
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              )}
            </Reveal>
          </div>
        </section>

        <section className="bg-section-soft">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="mb-8 font-heading text-2xl font-bold text-foreground">
              أطباء المركز
            </h2>
            {c.doctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="لا يوجد أطباء منشورون في هذا المركز بعد"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {c.doctors.map((d) => (
                  <Link key={d.slug} href={`/doctors/${d.slug}`}>
                    <Card className="flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                      <Avatar className="size-14 ring-2 ring-background">
                        {d.photoUrl && <AvatarImage src={d.photoUrl} alt={d.name} />}
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {d.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-heading font-bold text-foreground">
                          {d.name}
                        </p>
                        {d.title && (
                          <p className="truncate text-sm text-muted-foreground">
                            {d.title}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
