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
  CalendarDays,
  Sparkles,
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
  variant = "standard",
}: {
  doctor: DoctorCardData
  isSignedIn?: boolean
  favorited?: boolean
  variant?: "standard" | "featured"
}) {
  const initials = doctor.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"
  const showRating = doctor.reviewCount > 0 && doctor.rating
  const hue = hueForName(doctor.name)
  const isFeatured = variant === "featured"
  const consultationLabel =
    doctor.offersVideo && doctor.offersInPerson
      ? "فيديو أو حضورية"
      : doctor.offersVideo
        ? "استشارة فيديو"
        : doctor.offersInPerson
          ? "استشارة حضورية"
          : "حسب التوفر"
  const ConsultationIcon = doctor.offersVideo ? Video : Building2

  return (
    <div className="@container h-full">
    <Card
      dir="ltr"
      className={
        "group relative h-full overflow-hidden border-white/75 bg-card/95 p-0 shadow-elegant backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant-lg " +
        (isFeatured ? "@lg:grid @lg:grid-cols-[43%_1fr]" : "flex flex-col")
      }
    >
      <div
        className={
          "relative shrink-0 overflow-hidden bg-muted " +
          (isFeatured
            ? "min-h-72 @lg:min-h-full @lg:rounded-e-[2.35rem]"
            : "aspect-[4/3] rounded-b-[2rem]")
        }
      >
        {doctor.photoUrl ? (
          <Image
            src={doctor.photoUrl}
            alt={doctor.name}
            fill
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            sizes={
              isFeatured
                ? "(max-width: 768px) 100vw, (max-width: 1280px) 42vw, 26vw"
                : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            }
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, oklch(0.94 0.035 ${hue}), oklch(0.84 0.055 ${hue}))`,
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-white/10" />

        {doctor.verified && <VerifiedBadge className="absolute left-3 top-3" />}

        <div className="absolute right-3 top-3 z-10">
          <FavoriteToggle
            kind="doctor"
            refId={doctor.id}
            initialFavorited={favorited}
            isSignedIn={isSignedIn}
            size={34}
          />
        </div>

        {showRating && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur-md">
            <Star className="size-3.5 fill-current text-gold" />
            <span className="tabular-nums">{doctor.rating}</span>
            <span className="font-medium text-muted-foreground">
              ({doctor.reviewCount})
            </span>
          </span>
        )}
      </div>

      <div dir="rtl" className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 p-5">
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/doctors/${doctor.slug}`}
                  className="line-clamp-2 font-heading text-xl font-extrabold leading-tight text-foreground transition-colors hover:text-primary"
                >
                  {doctor.name}
                </Link>
                {doctor.title && (
                  <p className="mt-1 line-clamp-1 text-sm font-medium text-primary/80">
                    {doctor.title}
                  </p>
                )}
              </div>
              {doctor.verified && (
                <span
                  className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
                  aria-label="طبيب موثّق"
                >
                  <BadgeCheck className="size-4" />
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <MiniFact
              icon={MapPin}
              label="الموقع"
              value={[doctor.city, countryNameAr(doctor.country)]
                .filter(Boolean)
                .join("، ")}
            />
            <MiniFact
              icon={Stethoscope}
              label="الخبرة"
              value={`${doctor.yearsExperience} سنة`}
            />
            <MiniFact
              icon={ConsultationIcon}
              label="الاستشارة"
              value={consultationLabel}
            />
            <MiniFact
              icon={CalendarDays}
              label="الحجز"
              value="مواعيد مرنة"
            />
          </div>

          {doctor.procedures.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Sparkles className="size-3.5 text-gold" />
                أبرز الإجراءات
              </p>
              <div className="flex flex-wrap gap-1.5">
                {doctor.procedures.slice(0, 4).map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-foreground/80"
                  >
                    {p}
                  </span>
                ))}
                {doctor.procedures.length > 4 && (
                  <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    +{doctor.procedures.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-border/60 bg-background/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="text-[11px] font-medium text-muted-foreground">
              رسوم الاستشارة
            </p>
            {doctor.consultationFee ? (
              <p className="leading-tight">
                <span className="font-heading text-2xl font-extrabold tabular-nums text-foreground">
                  {Number(doctor.consultationFee).toLocaleString("ar-SA-u-nu-latn")}
                </span>
                <span className="ms-1 text-xs font-medium text-muted-foreground">
                  {currencyAr(doctor.currency)}
                </span>
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">تظهر عند الحجز</span>
            )}
          </div>
          <Button
            size="sm"
            className="w-full rounded-xl px-4 sm:w-auto"
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
    </div>
  )
}

function MiniFact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/65 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0 text-primary/75" />
        <span className="truncate text-[10px] font-medium">{label}</span>
      </div>
      <p className="mt-1 truncate font-semibold text-foreground">{value}</p>
    </div>
  )
}
