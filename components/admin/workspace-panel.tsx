import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * One cohesive bordered panel split into a main + side column by a single
 * internal divider — not two independently-carded columns with a gap
 * between them. Each column's own sub-sections are separated by hairline
 * dividers (see WorkspaceSection), not nested cards.
 */
export function WorkspacePanel({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">{main}</div>
      <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-28">{side}</div>
    </div>
  )
}

export type WorkspaceSectionTone = "primary" | "success" | "warning" | "danger" | "neutral"

const TONE_ICON: Record<WorkspaceSectionTone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
}

/** A lean bordered sub-section — a small header (icon + title + optional description/"view all"/action) plus content, not a heavy card. */
export function WorkspaceSection({
  title,
  description,
  viewAllHref,
  icon: Icon,
  tone = "primary",
  action,
  padded = false,
  children,
  className,
}: {
  title: string
  description?: string
  viewAllHref?: string
  icon?: LucideIcon
  tone?: WorkspaceSectionTone
  action?: React.ReactNode
  /** Applies default inner padding to children (for text-only/form content, not tables). */
  padded?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/88 shadow-elegant", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <Icon className={cn("size-[18px] shrink-0", TONE_ICON[tone])} />}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {viewAllHref && (
            <Link href={viewAllHref} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
              عرض الكل
            </Link>
          )}
        </div>
      </div>
      {padded ? <div className="p-5">{children}</div> : children}
    </div>
  )
}

export function WorkspaceEmpty({ text }: { text: string }) {
  return <p className="px-5 py-8 text-center text-sm leading-7 text-muted-foreground">{text}</p>
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
    <Link href={href} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-background/70">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {badge && <span className="shrink-0">{badge}</span>}
    </Link>
  )
}
