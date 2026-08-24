"use client"

import * as React from "react"
import Image from "next/image"
import { ImageOff, Sparkles } from "lucide-react"

export interface InteractiveCompareSliderProps {
  beforeUrl?: string | null
  afterUrl?: string | null
  beforeLabel?: string
  afterLabel?: string
  aspectRatio?: string
  className?: string
  initialPosition?: number
}

/**
 * Premium Before/After comparison slider with touch and mouse dragging,
 * luxury glassmorphism labels, gold handle, and keyboard accessibility.
 */
export function InteractiveCompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "قبل",
  afterLabel = "بعد",
  aspectRatio = "aspect-[4/5]",
  className = "",
  initialPosition = 50,
}: InteractiveCompareSliderProps) {
  const [position, setPosition] = React.useState<number>(initialPosition)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const hasBoth = Boolean(beforeUrl && afterUrl)

  const handlePointerMove = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setPosition(percent)
    },
    [],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    containerRef.current?.setPointerCapture(e.pointerId)
    handlePointerMove(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    handlePointerMove(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    try {
      containerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // ignore if pointer capture was already released
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      setPosition((prev) => Math.max(0, prev - 5))
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      setPosition((prev) => Math.min(100, prev + 5))
    } else if (e.key === "Home") {
      e.preventDefault()
      setPosition(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setPosition(100)
    }
  }

  if (!hasBoth) {
    return (
      <div
        className={`relative ${aspectRatio} w-full overflow-hidden rounded-xl bg-muted/60 flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}
      >
        <ImageOff className="size-8 stroke-[1.5] text-muted-foreground/60" />
        <span className="text-xs font-medium">الصور التوضيحية غير مكتملة</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="مؤشر مقارنة قبل وبعد"
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`group relative ${aspectRatio} w-full select-none overflow-hidden rounded-xl bg-muted cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* Before Image (Base Layer) */}
      <Image
        src={beforeUrl!}
        alt={beforeLabel}
        fill
        draggable={false}
        className="pointer-events-none object-cover"
        onContextMenu={(e) => e.preventDefault()}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* After Image (Clipped Layer on Top) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <Image
          src={afterUrl!}
          alt={afterLabel}
          fill
          draggable={false}
          className="pointer-events-none object-cover"
          onContextMenu={(e) => e.preventDefault()}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Divider Bar with Gold Glow Line */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-gradient-to-b from-white/60 via-gold to-white/60 shadow-[0_0_10px_rgba(201,162,75,0.6)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Center Circular Glass Handle */}
        <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/60 bg-background/90 text-primary shadow-elegant backdrop-blur-md transition-transform group-hover:scale-110">
          <div className="flex items-center gap-0.5">
            <span className="size-1 rounded-full bg-gold" />
            <Sparkles className="size-3 text-gold animate-pulse" />
            <span className="size-1 rounded-full bg-gold" />
          </div>
        </div>
      </div>

      {/* Luxury Badges (Before / After) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-3 text-[11px] font-semibold text-white">
        <span
          className="rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 backdrop-blur-md shadow-sm transition-opacity"
          style={{ opacity: position < 15 ? 0.3 : 1 }}
        >
          {beforeLabel}
        </span>
        <span
          className="rounded-lg border border-white/20 bg-black/60 px-2.5 py-1 backdrop-blur-md shadow-sm transition-opacity"
          style={{ opacity: position > 85 ? 0.3 : 1 }}
        >
          {afterLabel}
        </span>
      </div>
    </div>
  )
}
