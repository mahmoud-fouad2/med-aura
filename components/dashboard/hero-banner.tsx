import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Warm, editorial welcome banner for personal dashboards. Subtle brand
 * gradient + soft mesh pattern in the background. Left column holds the
 * greeting; right column optionally shows a status card / next-step CTA.
 *
 * All backgrounds are pure CSS — no external images, no CDN.
 */
export function DashboardHero({
  eyebrow,
  greeting,
  subtitle,
  actions,
  aside,
}: {
  eyebrow?: string
  greeting: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-border/70",
        // Warm ivory → subtle lavender wash; both sides of the theme.
        "bg-gradient-to-br from-secondary/50 via-background to-background",
        "shadow-[0_1px_2px_rgba(20,20,60,0.04),0_8px_24px_-16px_rgba(74,29,150,0.14)]",
      )}
    >
      {/* Decorative background — inline SVG, no external assets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
      >
        <svg
          className="absolute -right-16 -top-24 h-72 w-72 text-primary/8"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <defs>
            <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="100" fill="url(#hero-glow)" />
        </svg>
        <svg
          className="absolute -left-16 -bottom-24 h-64 w-64 text-secondary-foreground/8"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <circle cx="100" cy="100" r="100" fill="url(#hero-glow)" />
        </svg>
        {/* Dotted grid — very faint */}
        <svg
          className="absolute inset-0 h-full w-full text-primary/6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="hero-dots"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1.2" cy="1.2" r="1.2" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
      </div>

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0 space-y-4">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-[36px]">
            {greeting}
          </h1>
          {subtitle && (
            <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          {actions && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {actions}
            </div>
          )}
        </div>

        {aside && (
          <div className="lg:pt-2">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 backdrop-blur">
              {aside}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
