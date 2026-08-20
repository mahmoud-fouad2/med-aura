import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  MapPin,
  Building2,
  Stethoscope,
  ChevronLeft,
  Search,
} from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Stagger, StaggerItem } from "@/components/motion"
import { getDestinationBySlug } from "@/lib/data/destinations"
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  geoCoordinatesJsonLd,
  itemListJsonLd,
  jsonLdScript,
} from "@/lib/seo"
import { destinationImage, PUBLIC_MEDIA } from "@/lib/public-media"
import { getI18n } from "@/lib/i18n"
import { formatDoctorCount, formatExperience } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()])
  const d = await getDestinationBySlug(slug)
  if (!d) return { title: locale === "ar" ? "الوجهة غير موجودة" : "Destination not found" }
  const name = locale === "ar" ? d.nameAr : d.nameEn
  return buildPageMetadata({
    title: locale === "ar" ? `${name} — وجهة تجميلية` : `${name} — Aesthetic destination`,
    description: locale === "ar" ? `قارن الأطباء والمراكز المتاحة في ${name} على Med Aura.` : `Compare available doctors and centers in ${name} on Med Aura.`,
    path: `/destinations/${d.code.toLowerCase()}`,
    image: destinationImage(d.code),
  })
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { locale }] = await Promise.all([params, getI18n()])
  const d = await getDestinationBySlug(slug)
  if (!d) notFound()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const destinationName = isAr ? d.nameAr : d.nameEn

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: destinationName,
    alternateName: isAr ? d.nameEn : d.nameAr,
    image: absoluteUrl(destinationImage(d.code)),
    address: { "@type": "PostalAddress", addressCountry: d.code },
    ...(geoCoordinatesJsonLd(d.code) ? { geo: geoCoordinatesJsonLd(d.code) } : {}),
    url: absoluteUrl(`/destinations/${d.code.toLowerCase()}`),
    containsPlace: d.cities.map((city) => ({
      "@type": "City",
      name: city.nameAr,
      alternateName: city.nameEn,
    })),
  }
  const structuredData = [
    jsonLd,
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: absoluteUrl("/") },
      { name: l("الوجهات", "Destinations"), url: absoluteUrl("/destinations") },
      { name: destinationName, url: absoluteUrl(`/destinations/${d.code.toLowerCase()}`) },
    ]),
    itemListJsonLd({
      name: l(`المراكز المتاحة في ${d.nameAr}`, `Available centers in ${d.nameEn}`),
      items: d.centers.map((c) => ({
        name: c.name,
        url: absoluteUrl(`/centers/${c.slug}`),
        image: absoluteUrl(c.coverUrl ?? PUBLIC_MEDIA.centers),
      })),
    }),
    itemListJsonLd({
      name: l(`الأطباء المتاحون في ${d.nameAr}`, `Available doctors in ${d.nameEn}`),
      items: d.doctors.map((doctor) => ({
        name: doctor.name,
        url: absoluteUrl(`/doctors/${doctor.slug}`),
        ...(doctor.photoUrl ? { image: absoluteUrl(doctor.photoUrl) } : {}),
      })),
    }),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="absolute inset-0">
            <Image
              src={destinationImage(d.code)}
              alt={l(`وجهة ${d.nameAr}`, `${d.nameEn} destination`)}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/94 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <nav
              className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-label={l("مسار التنقل", "Breadcrumb")}
            >
              <Link href="/" className="hover:text-foreground">
                {l("الرئيسية", "Home")}
              </Link>
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              <Link href="/destinations" className="hover:text-foreground">
                {l("الوجهات", "Destinations")}
              </Link>
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              <span className="font-medium text-foreground">{destinationName}</span>
            </nav>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/85 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-md">
                  <MapPin className="size-3.5" />
                  {d.code}
                </span>
                <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                  {destinationName}
                </h1>
                <p dir="ltr" className="mt-1 text-right text-sm text-muted-foreground">
                  {isAr ? d.nameEn : d.code}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {l(
                    `قارن الأطباء والمراكز المتاحة على Med Aura في ${d.nameAr}.`,
                    `Compare doctors and centers available on Med Aura in ${d.nameEn}.`,
                  )}
                </p>
              </div>
              <Button render={<Link href={`/search?country=${d.code}`}>
                <Search className="size-4" />
                {l(`ابحث في ${d.nameAr}`, `Search in ${d.nameEn}`)}
              </Link>} />
            </div>
          </div>
        </section>

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {l("المراكز المتاحة", "Available centers")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {isAr ? `${d.centers.length.toLocaleString("ar-SA-u-nu-latn")} مركز` : `${d.centers.length.toLocaleString("en-US")} centers`}
                </span>
              </div>
              {d.centers.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title={l("لا توجد مراكز متاحة بعد في هذه الوجهة", "No centers are available in this destination yet")}
                  description={l("تصفّح باقي الوجهات أو تحقق لاحقًا.", "Browse other destinations or check again later.")}
                />
              ) : (
                <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {d.centers.map((c) => (
                    <StaggerItem key={c.id}>
                      <Link href={`/centers/${c.slug}`}>
                        <Card className="h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                          <div className="relative h-28 bg-muted">
                            <Image
                              src={c.coverUrl ?? PUBLIC_MEDIA.centers}
                              alt={l(`واجهة ${c.name}`, `${c.name} center`)}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                            <span className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-xl bg-white/92 text-primary shadow-elegant">
                              <Building2 className="size-5" />
                            </span>
                          </div>
                          <div className="p-5">
                            <h3 className="font-heading font-bold text-foreground">
                              {c.name}
                            </h3>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {[c.city, d.nameAr].filter(Boolean).join("، ")}
                            </p>
                            {c.description && (
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                {c.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  {l("الأطباء المتاحون", "Available doctors")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {formatDoctorCount(d.doctors.length, locale)}
                </span>
              </div>
              {d.doctors.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  title={l("لا يوجد أطباء متاحون بعد في هذه الوجهة", "No doctors are available in this destination yet")}
                  description={l("تصفّح أطباء الوجهات الأخرى أو ابدأ من صفحة الإجراءات.", "Browse other destinations or start from the procedure catalog.")}
                />
              ) : (
                <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {d.doctors.map((doc) => (
                    <StaggerItem key={doc.id}>
                      <Link href={`/doctors/${doc.slug}`}>
                        <Card className="flex h-full items-start gap-3 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                          <Avatar className="size-14 shrink-0 ring-2 ring-background">
                            {doc.photoUrl && <AvatarImage src={doc.photoUrl} alt={doc.name} />}
                            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                              {doc.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="truncate font-heading font-bold text-foreground">
                              {doc.name}
                            </h3>
                            {doc.title && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {doc.title}
                              </p>
                            )}
                            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {[doc.city, d.nameAr].filter(Boolean).join("، ")}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatExperience(doc.yearsExperience, locale)}
                            </p>
                          </div>
                        </Card>
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>

            {d.cities.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-2xl font-bold text-foreground">
                  {l("المدن", "Cities")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {d.cities.map((c) => (
                    <Link
                      key={c.id}
                      href={`/search?country=${d.code}&city=${encodeURIComponent(c.nameAr)}`}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {c.nameAr}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
