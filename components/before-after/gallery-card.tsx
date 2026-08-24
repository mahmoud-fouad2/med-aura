import Link from "next/link"
import type { BeforeAfterPublicItem } from "@/lib/data/before-after"
import { Card } from "@/components/ui/card"
import { InteractiveCompareSlider } from "@/components/ui/interactive-compare-slider"

/**
 * Public gallery card. Displays paired before/after images with a
 * luxury interactive comparison slider.
 */
export function BeforeAfterGalleryCard({
  item,
}: {
  item: BeforeAfterPublicItem
}) {
  return (
    <Card className="overflow-hidden p-0 border border-border/80 shadow-elegant transition-shadow hover:shadow-glow">
      <InteractiveCompareSlider
        beforeUrl={item.beforeUrl}
        afterUrl={item.afterUrl}
        beforeLabel="قبل"
        afterLabel="بعد"
        aspectRatio="aspect-[4/5]"
      />
      <div className="space-y-2 p-4">
        <p className="text-xs font-medium text-primary">
          {item.procedureNameAr}
        </p>
        <h3 className="font-heading font-bold text-foreground">
          {item.titleAr}
        </h3>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {item.ageRange && <span>العمر: {item.ageRange}</span>}
          {item.gender && (
            <span>
              {item.gender === "female"
                ? "أنثى"
                : item.gender === "male"
                  ? "ذكر"
                  : "أخرى"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {item.doctorSlug && item.doctorName && (
            <Link
              href={`/doctors/${item.doctorSlug}`}
              className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {item.doctorName}
            </Link>
          )}
          {item.centerSlug && item.centerName && (
            <Link
              href={`/centers/${item.centerSlug}`}
              className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {item.centerName}
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
