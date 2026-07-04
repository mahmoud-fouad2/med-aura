"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { ImageOff } from "lucide-react"
import type { BeforeAfterPublicItem } from "@/lib/data/before-after"
import { Card } from "@/components/ui/card"

/**
 * Public gallery card. Displays paired before/after images with a
 * mini-slider handle. `onContextMenu` and `draggable=false` on the images
 * cut down on casual downloads; a watermark on the R2 asset itself is the
 * durable protection (added client-side by the uploading tool — TODO once
 * we ship the doctor uploader with sharp).
 */
export function BeforeAfterGalleryCard({
  item,
}: {
  item: BeforeAfterPublicItem
}) {
  const [split, setSplit] = useState(50)
  const hasBoth = Boolean(item.beforeUrl && item.afterUrl)

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative aspect-[4/5] w-full select-none overflow-hidden bg-muted">
        {hasBoth ? (
          <>
            <Image
              src={item.beforeUrl!}
              alt="قبل"
              fill
              draggable={false}
              className="pointer-events-none object-cover"
              onContextMenu={(e) => e.preventDefault()}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
            >
              <Image
                src={item.afterUrl!}
                alt="بعد"
                fill
                draggable={false}
                className="pointer-events-none object-cover"
                onContextMenu={(e) => e.preventDefault()}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="absolute inset-x-0 bottom-3 flex justify-between px-3 text-[10px] font-medium tracking-wider text-white/90">
              <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                قبل
              </span>
              <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">
                بعد
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="مؤشر مقارنة قبل وبعد"
              className="absolute inset-x-3 bottom-8 h-1 cursor-ew-resize appearance-none rounded-full bg-white/40 accent-white"
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-6" />
            <span className="text-xs">لا توجد صور متاحة</span>
          </div>
        )}
      </div>
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
