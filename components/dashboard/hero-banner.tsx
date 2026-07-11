import type { ReactNode } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Warm, editorial welcome banner for personal dashboards. Left column holds
 * the greeting; right column optionally shows a status card / next-step CTA.
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
        "relative isolate overflow-hidden rounded-3xl border border-white/70 bg-card",
        "shadow-elegant-lg",
      )}
    >
      <Image
        src="/hero-medaura-consultation.png"
        alt=""
        fill
        className="absolute inset-0 -z-20 object-cover object-left opacity-28"
        sizes="(min-width: 1024px) 80rem, 100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--card)_96%,transparent)_0%,color-mix(in_oklab,var(--card)_92%,transparent)_48%,color-mix(in_oklab,var(--card)_72%,transparent)_100%)] ltr:bg-[linear-gradient(270deg,color-mix(in_oklab,var(--card)_96%,transparent)_0%,color-mix(in_oklab,var(--card)_92%,transparent)_48%,color-mix(in_oklab,var(--card)_72%,transparent)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

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
            <div className="rounded-2xl border border-white/70 bg-background/82 p-4 shadow-sm backdrop-blur-md">
              {aside}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
