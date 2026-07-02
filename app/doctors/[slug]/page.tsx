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

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-20">
                    <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading text-2xl font-bold text-foreground">
                        {doctor.name}
                      </h1>
                      {doctor.verified && (
                        <BadgeCheck className="size-5 text-primary" aria-label={isAr ? "موثّق" : "Verified"} />
                      )}
                    </div>
                    <p className="text-muted-foreground">{doctor.title}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-4" />
                        {[doctor.city, countryNameAr(doctor.country)].filter(Boolean).join("، ")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="size-4" />
                        {isAr ? `خبرة ${doctor.yearsExperience} سنة` : `${doctor.yearsExperience} Years Experience`}
                      </span>
                      {doctor.languages.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <LangIcon className="size-4" />
                          {doctor.languages.join("، ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {doctor.bio && (
                  <p className="mt-4 leading-relaxed text-foreground/90">{doctor.bio}</p>
                )}
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
                        ? new Date(doctor.lastVerifiedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")
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
                          ? `${Number(doctor.consultationFee).toLocaleString("ar-SA")} ${currencyAr(doctor.currency)}`
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
