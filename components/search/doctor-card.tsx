import Link from "next/link"
import { BadgeCheck, MapPin, Video, Building2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { currencyAr, countryNameAr } from "@/lib/status-labels"
import type { DoctorCard as DoctorCardData } from "@/lib/data/doctors"

export function DoctorCard({ doctor }: { doctor: DoctorCardData }) {
  const initials = doctor.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/doctors/${doctor.slug}`}
              className="truncate font-heading text-lg font-bold text-foreground hover:text-primary"
            >
              {doctor.name}
            </Link>
            {doctor.verified && (
              <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="موثّق" />
            )}
          </div>
          {doctor.title && (
            <p className="truncate text-sm text-muted-foreground">{doctor.title}</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {[doctor.city, countryNameAr(doctor.country)].filter(Boolean).join("، ")}
            <span aria-hidden>·</span>
            خبرة {doctor.yearsExperience} سنة
          </p>
        </div>
      </div>

      {doctor.procedures.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doctor.procedures.slice(0, 3).map((p) => (
            <Badge key={p} variant="secondary">
              {p}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {doctor.offersVideo && (
          <span className="inline-flex items-center gap-1">
            <Video className="size-3.5" /> استشارة فيديو
          </span>
        )}
        {doctor.offersInPerson && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3.5" /> حضوري
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
        <div className="text-sm">
          {doctor.consultationFee ? (
            <>
              <span className="font-bold text-foreground">
                {Number(doctor.consultationFee).toLocaleString("ar-SA")} {currencyAr(doctor.currency)}
              </span>
              <span className="text-muted-foreground"> / استشارة</span>
            </>
          ) : (
            <span className="text-muted-foreground">سعر الاستشارة عند الحجز</span>
          )}
        </div>
        <Button size="sm" render={<Link href={`/doctors/${doctor.slug}`}>عرض الملف</Link>} />
      </div>
    </Card>
  )
}
