import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  BadgeCheck,
  MapPin,
  Languages as LangIcon,
  ShieldCheck,
  Stethoscope,
  Video,
  Building2,
} from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DataState } from "@/components/ui/data-state"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { query } from "@/lib/db/query"
import { currencyAr, countryNameAr } from "@/lib/status-labels"
import { getI18n } from "@/lib/i18n"
import { appUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const r = await query(() => getPublicDoctorBySlug(slug))
  const doctor = r.status === "ok" ? r.data : null
  if (!doctor) return { title: isAr ? "الطبيب غير موجود" : "Doctor not found" }
  return {
    title: isAr 
      ? `${doctor.name} — ${doctor.title ?? "طبيب تجميل"}`
      : `${doctor.name} — ${doctor.title ?? "Aesthetic Doctor"}`,
    description: doctor.bio ?? `${doctor.name}، ${doctor.title ?? ""} on Med Aura.`,
  }
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { locale }] = await Promise.all([
    params,
    getI18n()
  ])
  const isAr = locale === "ar"

  const r = await query(() => getPublicDoctorBySlug(slug))
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
  const doctor = r.data
  if (!doctor) notFound()

  const initials = doctor.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"

  // Schema.org — Physician. Every field is real; ratings only surface when
  // there's actual review volume (no fake averages).
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    ...(doctor.title ? { jobTitle: doctor.title } : {}),
    ...(doctor.bio ? { description: doctor.bio } : {}),
    url: `${appUrl()}/doctors/${doctor.slug}`,
    address: {
      "@type": "PostalAddress",
      addressCountry: doctor.country,
      ...(doctor.city ? { addressLocality: doctor.city } : {}),
    },
    ...(doctor.languages?.length ? { knowsLanguage: doctor.languages } : {}),
    medicalSpecialty: "Plastic Surgery",
  }
  if (doctor.reviewCount > 0 && doctor.rating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: doctor.rating,
      reviewCount: doctor.reviewCount,
      bestRating: "5",
      worstRating: "1",
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Card className="relative overflow-hidden p-0">
                {/* Editorial cover gradient */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="relative h-32 bg-gradient-to-br from-primary/10 via-secondary/50 to-background">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-60"
                  >
                    <svg
                      className="h-full w-full text-primary/8"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern
                          id="doc-dots"
                          width="16"
                          height="16"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle cx="1" cy="1" r="1" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#doc-dots)" />
                    </svg>
                  </div>
                </div>

                <div className="p-6">
                  <div className="-mt-16 flex items-end gap-4 sm:gap-6">
                    <Avatar className="size-24 shrink-0 ring-4 ring-background">
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-3xl font-heading font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      {doctor.verified && (
                        <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                          <BadgeCheck className="size-3" />
                          طبيب موثّق
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <h1 className="font-heading text-3xl font-bold leading-tight text-foreground">
                      {doctor.name}
                    </h1>
                    {doctor.title && (
                      <p className="text-base text-muted-foreground">
                        {doctor.title}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4 text-primary/70" />
                        {[doctor.city, countryNameAr(doctor.country)]
                          .filter(Boolean)
                          .join("، ")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Stethoscope className="size-4 text-primary/70" />
                        {isAr
                          ? `خبرة ${doctor.yearsExperience} سنة`
                          : `${doctor.yearsExperience} Years Experience`}
                      </span>
                      {doctor.languages.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <LangIcon className="size-4 text-primary/70" />
                          {doctor.languages.join("، ")}
                        </span>
                      )}
                    </div>
                    {doctor.reviewCount > 0 && doctor.rating && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm">
                        <div className="inline-flex items-center gap-0.5 text-warning-foreground">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={
                                "size-3 rounded-full " +
                                (i < Math.round(Number(doctor.rating))
                                  ? "bg-current"
                                  : "bg-muted")
                              }
                            />
                          ))}
                        </div>
                        <span className="font-medium tabular-nums text-foreground">
                          {doctor.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({doctor.reviewCount} تقييم)
                        </span>
                      </div>
                    )}
                  </div>

                  {doctor.bio && (
                    <p className="mt-5 leading-relaxed text-foreground/90">
                      {doctor.bio}
                    </p>
                  )}
                </div>
              </Card>

              {doctor.procedures.length > 0 && (
                <Card className="p-6">
                  <h2 className="mb-3 font-heading text-lg font-bold text-foreground">
                    {isAr ? "الإجراءات" : "Procedures"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {doctor.procedures.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                  <ShieldCheck className="size-5 text-primary" />
                  {isAr ? "التحقق والاعتماد" : "Acquisition & License Verification"}
                </h2>
                <dl className="space-y-2 text-sm">
                  <Row label={isAr ? "حالة التحقق" : "Verification Status"} value={doctor.verified ? (isAr ? "موثّق" : "Verified") : "—"} />
                  <Row label={isAr ? "جهة الترخيص" : "Licensing Authority"} value={doctor.licenseAuthority ?? "—"} />
                  <Row
                    label={isAr ? "رقم الترخيص" : "License Number"}
                    value={doctor.licenseLast4 ? `•••• ${doctor.licenseLast4}` : "—"}
                  />
                  <Row
                    label={isAr ? "آخر تحقق" : "Last Verification Check"}
                    value={
                      doctor.lastVerifiedAt
                        ? new Date(doctor.lastVerifiedAt).toLocaleDateString(isAr ? "ar-SA-u-nu-latn" : "en-US")
                        : "—"
                    }
                  />
                  {doctor.centerName && (
                    <Row label={isAr ? "المركز" : "Aesthetic Center"} value={doctor.centerName} />
                  )}
                </dl>
              </Card>
            </div>

            {/* Booking sidebar */}
            <aside className="space-y-4">
              <Card className="sticky top-20 p-6">
                <div className="mb-4">
                  {doctor.consultationFee ? (
                    <p>
                      <span className="font-heading text-2xl font-bold text-foreground">
                        {isAr 
                          ? `${Number(doctor.consultationFee).toLocaleString("ar-SA-u-nu-latn")} ${currencyAr(doctor.currency)}`
                          : `${Number(doctor.consultationFee).toLocaleString("en-US")} ${doctor.currency}`}
                      </span>
                      <span className="text-muted-foreground"> / {isAr ? "استشارة" : "Consultation"}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">{isAr ? "سعر الاستشارة يُحدد عند الحجز" : "Consultation fee is set upon booking"}</p>
                  )}
                </div>
                <div className="mb-6 flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {doctor.offersVideo && (
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="size-4 text-primary" /> {isAr ? "استشارة فيديو" : "Video Consultation"}
                    </span>
                  )}
                  {doctor.offersInPerson && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="size-4 text-primary" /> {isAr ? "استشارة حضورية" : "In-Person Consultation"}
                    </span>
                  )}
                </div>
                
                {/* Optimized Conversion Path UI */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Button
                      className="w-full h-11 text-base shadow-elegant"
                      render={
                        <Link href={`/doctors/${doctor.slug}/book`}>
                          {isAr ? "حجز استشارة مباشر" : "Book Direct Appointment"}
                        </Link>
                      }
                    />
                    <p className="text-[11px] text-muted-foreground text-center">
                      {isAr ? "اختر موعداً فورياً واستشر طبيبك بالكامل" : "Select an instant slot and consult your doctor directly"}
                    </p>
                  </div>
                  
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-border/80"></div>
                    <span className="flex-shrink mx-3 text-xs text-muted-foreground font-medium">{isAr ? "أو" : "Or"}</span>
                    <div className="flex-grow border-t border-border/80"></div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant="outline"
                      className="w-full h-11 text-base transition-all"
                      render={
                        <Link href={`/dashboard/cases/new?doctor=${doctor.id}`}>
                          {isAr ? "ابدأ دراسة حالة بأمان" : "Start Case Study Safely"}
                        </Link>
                      }
                    />
                    <p className="text-[11px] text-muted-foreground text-center">
                      {isAr ? "شارك صورك وتقاريرك للحصول على خطة وسعر متوقع" : "Share photos & details for a custom plan and price from the doctor"}
                    </p>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
