import Link from "next/link"
import Image from "next/image"
import {
  BadgeCheck,
  MapPin,
  Video,
  Building2,
  Star,
  Stethoscope,
  ChevronLeft,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VerifiedBadge } from "@/components/ui/verified-badge"
import { FavoriteToggle } from "@/components/favorites/favorite-toggle"
import { currencyAr, countryNameAr } from "@/lib/status-labels"
import type { DoctorCard as DoctorCardData } from "@/lib/data/doctors"

function hueForName(name: string): number {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

export function DoctorCard({
  doctor,
  isSignedIn = false,
  favorited = false,
}: {
  doctor: DoctorCardData
  isSignedIn?: boolean
  favorited?: boolean
}) {
  const initials =
    doctor.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"
  const showRating = doctor.reviewCount > 0 && doctor.rating
  const hue = hueForName(doctor.name)
  const consultationLabel =
    doctor.offersVideo && doctor.offersInPerson
      ? "فيديو أو حضورية"
      : doctor.offersVideo
        ? "استشارة فيديو"
        : doctor.offersInPerson
          ? "استشارة حضورية"
          : null
  const ConsultationIcon = doctor.offersVideo ? Video : Building2

  return (
    <Card dir="ltr" className="group relative grid h-full overflow-hidden border-white/70 bg-card/90 p-0 shadow-elegant backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant-lg sm:grid-cols-[44%_1fr]">
      <div className="relative min-h-64 w-full shrink-0 overflow-hidden sm:min-h-full sm:rounded-e-[2.4rem]">
        {doctor.photoUrl ? (
          <Image
            src={doctor.photoUrl}
            alt={doctor.name}
            fill
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, oklch(0.93 0.045 ${hue}), oklch(0.86 0.06 ${hue}))`,
            }}
          >
            <span
              className="font-heading text-5xl font-bold"
              style={{ color: `oklch(0.4 0.11 ${hue})` }}
            >
              {initials}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5" />

        {doctor.verified && (
          <VerifiedBadge className="absolute left-3 top-3" />
        )}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteToggle
            kind="doctor"
            refId={doctor.id}
            initialFavorited={favorited}
            isSignedIn={isSignedIn}
            size={32}
          />
        </div>
      </div>

      <div dir="rtl" className="flex min-w-0 flex-col">
        <div className="flex-1 space-y-3.5 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/doctors/${doctor.slug}`}
                className="line-clamp-2 font-heading text-lg font-bold leading-tight text-foreground transition-colors hover:text-primary"
              >
                {doctor.name}
              </Link>
              {doctor.verified && (
                <BadgeCheck
                  className="size-4 shrink-0 text-primary"
                  aria-label="طبيب موثّق"
                />
              )}
              {showRating && (
                <span className="ms-auto inline-flex items-center gap-0.5 rounded-full bg-gold/12 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  <Star className="size-3 fill-current text-gold" />
                  <span className="tabular-nums">{doctor.rating}</span>
                </span>
              )}
            </div>
            {doctor.title && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {doctor.title}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary/70" />
              <span className="truncate">
                {[doctor.city, countryNameAr(doctor.country)]
                  .filter(Boolean)
                  .join("، ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 shrink-0 text-primary/70" />
              خبرة {doctor.yearsExperience} سنة
            </div>
          </div>

          {doctor.procedures.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-foreground">
                أبرز الإجراءات
              </p>
              <div className="flex flex-wrap gap-1.5">
                {doctor.procedures.slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
                {doctor.procedures.length > 3 && (
                  <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    +{doctor.procedures.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {consultationLabel && (
            <div className="border-t border-border/60 pt-3">
              <p className="mb-1 text-xs font-bold text-foreground">
                نوع الاستشارة
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ConsultationIcon className="size-4 text-primary/70" />
                {consultationLabel}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 border-t border-border/60 bg-background/70 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 text-sm">
            <p className="text-[10px] font-medium text-muted-foreground">
              رسوم الاستشارة
            </p>
            {doctor.consultationFee ? (
              <p>
                <span className="font-heading text-xl font-bold tabular-nums text-foreground">
                  {Number(doctor.consultationFee).toLocaleString("ar-SA-u-nu-latn")}
                </span>
                <span className="ms-1 text-xs text-muted-foreground">
                  {currencyAr(doctor.currency)}
                </span>
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">عند الحجز</span>
            )}
          </div>
          <Button
            size="sm"
            className="w-full rounded-xl px-4 xl:w-auto"
            render={
              <Link href={`/doctors/${doctor.slug}`}>
                عرض الملف
                <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            }
          />
        </div>
      </div>
    </Card>
  )
}
