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
    <section className="overflow-hidden rounded-2xl border border-white/60 bg-card/85 shadow-elegant-lg backdrop-blur-md transition-all duration-300">
      <header className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4.5 bg-gradient-to-l from-muted/5 to-transparent">
        <div className="flex items-start gap-3">
          {Icon && (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 hover:scale-105 ring-1",
                tone === "primary" && "bg-primary/10 text-primary ring-primary/10",
                tone === "success" && "bg-success/12 text-success ring-success/10",
                tone === "warning" && "bg-warning/15 text-warning-foreground ring-warning/10",
                tone === "danger" && "bg-destructive/10 text-destructive ring-destructive/10",
                tone === "neutral" && "bg-muted text-muted-foreground ring-border/10",
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
              <p className="mt-0.5 text-xs text-muted-foreground/85 font-medium">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-all hover:bg-primary/12"
            >
              {viewAllLabel}
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </header>
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  )
}
