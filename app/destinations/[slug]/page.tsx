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
import { appUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const d = await getDestinationBySlug(slug)
  if (!d) return { title: "الوجهة غير موجودة" }
  return {
    title: `${d.nameAr} — وجهة تجميلية`,
    description: `الأطباء والمراكز التجميلية المعتمدون في ${d.nameAr} على Med Aura.`,
    alternates: {
      canonical: `${appUrl()}/destinations/${d.code.toLowerCase()}`,
    },
  }
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const d = await getDestinationBySlug(slug)
  if (!d) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: d.nameAr,
    alternateName: d.nameEn,
    address: { "@type": "PostalAddress", addressCountry: d.code },
    url: `${appUrl()}/destinations/${d.code.toLowerCase()}`,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <nav
              className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-label="مسار التنقل"
            >
              <Link href="/" className="hover:text-foreground">
                الرئيسية
              </Link>
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              <Link href="/destinations" className="hover:text-foreground">
                الوجهات
              </Link>
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              <span className="font-medium text-foreground">{d.nameAr}</span>
            </nav>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/85 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur-md">
                  <MapPin className="size-3.5" />
                  {d.code}
                </span>
                <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
                  {d.nameAr}
                </h1>
                <p dir="ltr" className="mt-1 text-right text-sm text-muted-foreground">
                  {d.nameEn}
                </p>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  الأطباء والمراكز التجميلية المعتمدون على Med Aura في{" "}
                  {d.nameAr}. جميع الملفات مراجعة ومتحققة قبل النشر.
                </p>
              </div>
              <Button render={<Link href={`/search?country=${d.code}`}>
                <Search className="size-4" />
                ابحث في {d.nameAr}
              </Link>} />
            </div>
          </div>
        </section>

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  المراكز المعتمدة
                </h2>
                <span className="text-sm text-muted-foreground">
                  {d.centers.length.toLocaleString("ar-SA-u-nu-latn")} مركز
                </span>
              </div>
              {d.centers.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="لا توجد مراكز معتمدة بعد في هذه الوجهة"
                  description="نعمل على استقطاب مراكز موثقة. تحقق لاحقًا أو تصفّح باقي الوجهات."
                />
              ) : (
                <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {d.centers.map((c) => (
                    <StaggerItem key={c.id}>
                      <Link href={`/centers/${c.slug}`}>
                        <Card className="h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                          <div className="relative h-28 bg-muted">
                            <Image
                              src="/demo-services/aesthetic-clinic-lounge.png"
                              alt=""
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
                  الأطباء المعتمدون
                </h2>
                <span className="text-sm text-muted-foreground">
                  {d.doctors.length.toLocaleString("ar-SA-u-nu-latn")} طبيب
                </span>
              </div>
              {d.doctors.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  title="لا يوجد أطباء معتمدون بعد في هذه الوجهة"
                  description="تصفّح أطباء الوجهات الأخرى أو ابدأ من صفحة الإجراءات."
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
                              خبرة {doc.yearsExperience.toLocaleString("ar-SA-u-nu-latn")} سنة
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
                  المدن
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
