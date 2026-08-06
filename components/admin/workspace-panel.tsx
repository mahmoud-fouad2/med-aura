import Link from "next/link"

/**
 * One cohesive bordered panel split into a main + side column by a single
 * internal divider — not two independently-carded columns with a gap
 * between them. Each column's own sub-sections are separated by hairline
 * dividers (see WorkspaceSection), not nested cards.
 */
export function WorkspacePanel({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">{main}</div>
      <div className="space-y-4 lg:col-span-4">{side}</div>
    </div>
  )
}

/** A lean bordered sub-section — a small header (title + optional description/"view all") plus content, not a heavy card. */
export function WorkspaceSection({
  title,
  description,
  viewAllHref,
  children,
  className,
}: {
  title: string
  description?: string
  viewAllHref?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border/60 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="truncate text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="shrink-0 text-xs font-medium text-primary hover:underline">
            عرض الكل
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

export function WorkspaceEmpty({ text }: { text: string }) {
  return <p className="px-4 py-4 text-center text-xs text-muted-foreground">{text}</p>
}

/** One compact row, 52-58px tall. */
export function WorkspaceRow({
  href,
  title,
  subtitle,
  badge,
}: {
  href: string
  title: string
  subtitle: string
  badge?: React.ReactNode
}) {
  return (
    <Link href={href} className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {badge && <span className="shrink-0">{badge}</span>}
    </Link>
  )
}
