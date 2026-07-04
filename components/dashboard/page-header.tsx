import type { ReactNode } from "react"

/**
 * Editorial page header for dashboard surfaces.
 *
 * `eyebrow` is the small uppercase tracking label above the title (e.g.
 * "نظرة عامة") that gives every page a magazine-like identity. `actions`
 * fills the trailing edge with buttons/CTAs. `stats` is an optional row
 * of tiny "at-a-glance" figures rendered under the title.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  stats,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  stats?: { label: string; value: ReactNode }[]
}) {
  return (
    <header className="space-y-4 border-b border-border/60 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          {eyebrow && (
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-[32px]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 pt-1">
          {stats.map((s, i) => (
            <div
              key={i}
              className="min-w-[80px] border-e border-border/50 pe-6 first:ps-0 last:border-0 last:pe-0"
            >
              <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </dt>
              <dd className="mt-0.5 font-heading text-xl font-bold tabular-nums text-foreground">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  )
}
