import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Editorial section container for dashboards. Larger, calmer, with a
 * refined header. `tone` optionally tints the header stripe. `viewAllHref`
 * renders a right-aligned link with a slide-on-hover chevron.
 */
export function SectionCard({
  icon: Icon,
  title,
  description,
  viewAllHref,
  viewAllLabel = "عرض الكل",
  action,
  tone = "primary",
  padded = false,
  children,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  viewAllHref?: string
  viewAllLabel?: string
  action?: React.ReactNode
  tone?: "primary" | "success" | "warning" | "danger" | "neutral"
  /** If true, applies default inner padding to children (for text-only sections). */
  padded?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(20,20,60,0.04),0_4px_16px_-8px_rgba(20,20,60,0.08)]">
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                tone === "primary" && "bg-primary/10 text-primary",
                tone === "success" && "bg-success/12 text-success",
                tone === "warning" && "bg-warning/15 text-warning-foreground",
                tone === "danger" && "bg-destructive/10 text-destructive",
                tone === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-heading text-[15px] font-bold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {viewAllLabel}
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </header>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  )
}
