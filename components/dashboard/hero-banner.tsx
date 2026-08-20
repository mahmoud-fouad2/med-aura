import type { ReactNode } from "react"

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
    <section className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div className="min-w-0 space-y-3">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {greeting}
          </h1>
          {subtitle && (
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
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
          <div className="border-t border-border/70 pt-5 lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
            {aside}
          </div>
        )}
      </div>
    </section>
  )
}
