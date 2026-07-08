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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
      {/* Premium ambient layout with elegant glowing background orbs */}
      <main className="relative flex-1 bg-muted/20 overflow-hidden">
        {/* Soft glowing auras */}
        <div className="pointer-events-none absolute -top-48 left-1/3 size-[30rem] rounded-full bg-primary/8 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 size-[25rem] rounded-full bg-accent/30 blur-[130px]" />
        
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* Premium Card with elegant purple border-hint and modern soft drop shadows */}
              <Card className="relative overflow-hidden p-0 border-white/60 bg-card/85 backdrop-blur-md shadow-elegant-lg">
                {/* Editorial glowing aura bar */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
                
                {/* Taller Luxury cover banner with mesh-gradient-like visual and radial overlay */}
                <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/18 via-primary/5 to-secondary/35">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent opacity-70" />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
                  >
                    <svg
                      className="h-full w-full text-foreground"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern
                          id="doc-dots"
                          width="16"
                          height="16"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#doc-dots)" />
                    </svg>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {/* Dynamic relative avatar container that shifts on screens */}
                  <div className="-mt-20 sm:-mt-24 flex flex-col sm:flex-row sm:items-end justify-between items-start gap-4">
                    <Avatar className="size-28 sm:size-32 shrink-0 ring-4 sm:ring-[6px] ring-background shadow-elegant-lg">
                      {doctor.photoUrl && <AvatarImage src={doctor.photoUrl} alt={doctor.name} />}
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-4xl font-heading font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      {doctor.verified && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm shadow-primary/5 animate-pulse-gentle">
                          <BadgeCheck className="size-4" />
                          طبيب موثّق
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <h1 className="font-heading text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
                      {doctor.name}
                    </h1>
                    {doctor.title && (
                      <p className="text-lg font-medium text-primary/80">
                        {doctor.title}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1.5 text-sm text-muted-foreground border-t border-border/40">
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
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-sm shadow-sm">
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
                        <span className="font-bold tabular-nums text-foreground">
                          {doctor.rating}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({doctor.reviewCount} تقييم)
                        </span>
                      </div>
                    )}
                  </div>

                  {doctor.bio && (
                    <p className="mt-6 leading-relaxed text-foreground/80 text-base border-t border-border/40 pt-4">
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
              <Card className="sticky top-24 p-6 sm:p-7 border-white/60 bg-gradient-to-b from-card to-secondary/5 shadow-elegant-lg backdrop-blur-md">
                <div className="mb-5 rounded-2xl bg-primary/5 p-4 border border-primary/10">
                  {doctor.consultationFee ? (
                    <div>
                      <p className="text-[11px] font-heading font-bold text-primary/65 mb-1.5 uppercase tracking-widest">
                        {isAr ? "رسوم الاستشارة" : "Consultation Fee"}
                      </p>
                      <p className="flex items-baseline flex-wrap gap-1">
                        <span className="font-heading text-3xl font-extrabold text-foreground tabular-nums">
                          {isAr 
                            ? Number(doctor.consultationFee).toLocaleString("ar-SA-u-nu-latn")
                            : Number(doctor.consultationFee).toLocaleString("en-US")}
                        </span>
                        <span className="font-heading text-sm font-bold text-primary/95">
                          {isAr ? currencyAr(doctor.currency) : doctor.currency}
                        </span>
                        <span className="text-xs text-muted-foreground"> / {isAr ? "جلسة" : "session"}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-primary/80 text-center py-1">
                      {isAr ? "يتحدد سعر الاستشارة عند الحجز" : "Consultation fee is set upon booking"}
                    </p>
                  )}
                </div>

                <div className="mb-6 flex flex-col gap-2 text-sm border-b border-border/40 pb-5">
                  {doctor.offersVideo && (
                    <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Video className="size-4" />
                      </span>
                      {isAr ? "استشارة مرئية (فيديو)" : "Video Consultation"}
                    </span>
                  )}
                  {doctor.offersInPerson && (
                    <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-4" />
                      </span>
                      {isAr ? "استشارة حضورية مرخّصة" : "In-Person Consultation"}
                    </span>
                  )}
                </div>
                
                {/* Optimized Conversion Path UI */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Button
                      className="w-full h-12 text-base font-bold shadow-elegant hover:scale-[1.01] transition-transform"
                      render={
                        <Link href={`/doctors/${doctor.slug}/book`}>
                          {isAr ? "حجز استشارة مباشر" : "Book Direct Appointment"}
                        </Link>
                      }
                    />
                    <p className="text-[11px] text-muted-foreground text-center px-1">
                      {isAr ? "احصل على استشارة فورية مع طبيبك وناقش خياراتك" : "Select an instant slot and consult your doctor directly"}
                    </p>
                  </div>
                  
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-border/40"></div>
                    <span className="flex-shrink mx-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{isAr ? "أو" : "Or"}</span>
                    <div className="flex-grow border-t border-border/40"></div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-base font-semibold transition-all hover:bg-muted/80 hover:scale-[1.01]"
                      render={
                        <Link href={`/dashboard/cases/new?doctor=${doctor.id}`}>
                          {isAr ? "ابدأ دراسة حالة بأمان" : "Start Case Study Safely"}
                        </Link>
                      }
                    />
                    <p className="text-[11px] text-muted-foreground text-center px-1">
                      {isAr ? "شارك صورك وبياناتك للحصول على خطة مخصصة وتقدير سعر" : "Share photos & details for a custom plan and price from the doctor"}
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
