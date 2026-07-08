import type { ReactNode } from "react"

/**
 * Mobile replacement for a data-table row — used below `sm:` where a wide
 * table would otherwise force horizontal scrolling. Shows the primary
 * identity + status up top, secondary fields as a compact grid, and actions
 * pinned to the bottom so they stay easy to tap.
 */
export function MobileDataCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  rows?: { label: string; value: ReactNode }[]
  actions?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {rows && rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/60 pt-3 text-xs">
          {rows.map((r, i) => (
            <div key={i} className="min-w-0">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-border/60 pt-3 [&>*]:min-w-0 has-[>[data-slot=card]]:flex-col has-[>[data-slot=card]]:items-stretch">
          {actions}
        </div>
      )}
    </div>
  )
}
