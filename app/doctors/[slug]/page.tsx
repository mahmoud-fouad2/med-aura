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
import { getPublicDoctorBySlug } from "@/lib/data/doctors"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doctor = await getPublicDoctorBySlug(slug)
  if (!doctor) return { title: "الطبيب غير موجود" }
  return {
    title: `${doctor.name} — ${doctor.title ?? "طبيب تجميل"}`,
    description: doctor.bio ?? `${doctor.name}، ${doctor.title ?? ""} على Med Aura.`,
  }
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doctor = await getPublicDoctorBySlug(slug)
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
                        <BadgeCheck className="size-5 text-primary" aria-label="موثّق" />
                      )}
                    </div>
                    <p className="text-muted-foreground">{doctor.title}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-4" />
                        {[doctor.city, doctor.country].filter(Boolean).join("، ")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="size-4" />
                        خبرة {doctor.yearsExperience} سنة
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
                    الإجراءات
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
                  التحقق والاعتماد
                </h2>
                <dl className="space-y-2 text-sm">
                  <Row label="حالة التحقق" value={doctor.verified ? "موثّق" : "—"} />
                  <Row label="جهة الترخيص" value={doctor.licenseAuthority ?? "—"} />
                  <Row
                    label="رقم الترخيص"
                    value={doctor.licenseLast4 ? `•••• ${doctor.licenseLast4}` : "—"}
                  />
                  <Row
                    label="آخر تحقق"
                    value={
                      doctor.lastVerifiedAt
                        ? new Date(doctor.lastVerifiedAt).toLocaleDateString("ar-SA")
                        : "—"
                    }
                  />
                  {doctor.centerName && (
                    <Row label="المركز" value={doctor.centerName} />
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
                        {Number(doctor.consultationFee).toLocaleString("ar-SA")} {doctor.currency}
                      </span>
                      <span className="text-muted-foreground"> / استشارة</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">سعر الاستشارة يُحدد عند الحجز</p>
                  )}
                </div>
                <div className="mb-4 flex flex-col gap-1 text-sm text-muted-foreground">
                  {doctor.offersVideo && (
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="size-4 text-primary" /> استشارة فيديو
                    </span>
                  )}
                  {doctor.offersInPerson && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="size-4 text-primary" /> استشارة حضورية
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    render={
                      <Link href={`/doctors/${doctor.slug}/book`}>
                        حجز استشارة
                      </Link>
                    }
                  />
                  <Button
                    variant="outline"
                    render={
                      <Link href={`/dashboard/cases/new?doctor=${doctor.id}`}>
                        ابدأ حالتك
                      </Link>
                    }
                  />
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
