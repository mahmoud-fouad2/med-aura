"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Locale } from "@/lib/i18n/config"

export function TestimonialsSlider({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const trackId = useId()
  const [edges, setEdges] = useState({ previous: false, next: false })
  const isAr = locale === "ar"

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => {
      const offset = Math.abs(track.scrollLeft)
      setEdges({
        previous: offset > 1,
        next: offset + track.clientWidth < track.scrollWidth - 1,
      })
    }
    const resize = new ResizeObserver(update)
    resize.observe(track)
    track.addEventListener("scroll", update, { passive: true })
    update()
    return () => {
      resize.disconnect()
      track.removeEventListener("scroll", update)
    }
  }, [children, locale])

  function move(direction: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({
      left: direction * (isAr ? -1 : 1) * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    })
  }

  return (
    <div className="mt-9">
      <div
        ref={trackRef}
        id={trackId}
        dir={isAr ? "rtl" : "ltr"}
        role="region"
        aria-label={isAr ? "تقييمات المرضى" : "Patient reviews"}
        tabIndex={0}
        className="grid snap-x snap-mandatory auto-cols-[88%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[48%] lg:auto-cols-[calc((100%-2rem)/3)] focus-visible:outline-2 focus-visible:outline-ring"
      >
        {children}
      </div>
      {(edges.previous || edges.next) && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={!edges.previous}
            aria-controls={trackId}
            aria-label={isAr ? "التقييمات السابقة" : "Previous reviews"}
            title={isAr ? "التقييمات السابقة" : "Previous reviews"}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isAr ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={!edges.next}
            aria-controls={trackId}
            aria-label={isAr ? "التقييمات التالية" : "Next reviews"}
            title={isAr ? "التقييمات التالية" : "Next reviews"}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {isAr ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </div>
      )}
    </div>
  )
}
