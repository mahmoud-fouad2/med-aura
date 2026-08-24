import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MetricTone = "primary" | "success" | "warning" | "danger" | "neutral"

const TONE: Record<
  MetricTone,
  { bg: string; text: string; ring: string; number: string }
> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
    number: "text-foreground",
  },
  success: {
    bg: "bg-success/12",
    text: "text-success",
    ring: "ring-success/20",
    number: "text-foreground",
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning-foreground",
    ring: "ring-warning/22",
    number: "text-warning-foreground",
  },
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/20",
    number: "text-destructive",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
    number: "text-foreground",
  },
}

/**
 * Editorial KPI card. Optimised for scan-ability: the number carries the
 * visual weight, the icon is a small subject-tag, and label + hint sit
 * in a clear supporting hierarchy. Wraps in a Link if `href` is provided.
 *
 * `emphasis` scales the card up for the first row of hero metrics.
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "primary",
  emphasis = false,
  action,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  href?: string
  tone?: MetricTone
  emphasis?: boolean
  action?: React.ReactNode
}) {
  const t = TONE[tone]

  const body = (
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300",
        href
          ? "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
          : "",
        emphasis && "sm:p-6",
        emphasis && tone === "danger" && "alert-glow-danger",
        emphasis && tone === "warning" && "alert-glow-warning",
      )}
    >
      {/* Subtle top gradient accent */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-350",
          tone === "primary" && "bg-gradient-to-r from-transparent via-primary/45 to-transparent",
          tone === "success" && "bg-gradient-to-r from-transparent via-success/45 to-transparent",
          tone === "warning" && "bg-gradient-to-r from-transparent via-warning/45 to-transparent",
          tone === "danger" && "bg-gradient-to-r from-transparent via-destructive/45 to-transparent",
          tone === "neutral" && "bg-gradient-to-r from-transparent via-border to-transparent",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-105",
            emphasis ? "size-11" : "size-10",
            t.bg,
            t.text,
            t.ring,
          )}
        >
          <Icon className={emphasis ? "size-5" : "size-4.5"} aria-hidden="true" />
        </span>

        {href && (
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary rtl:-scale-x-100"
          >
            <ArrowUpRight className="size-4" />
          </span>
        )}
        {action && !href && <div className="shrink-0">{action}</div>}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "font-heading font-bold tabular-nums leading-tight",
            emphasis ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
            t.number,
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs leading-5 text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
        {body}
      </Link>
    )
  }

  return body
}
