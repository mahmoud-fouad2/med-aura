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
    ring: "ring-primary/15",
    number: "text-foreground",
  },
  success: {
    bg: "bg-success/12",
    text: "text-success",
    ring: "ring-success/15",
    number: "text-foreground",
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning-foreground",
    ring: "ring-warning/20",
    number: "text-warning-foreground",
  },
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/15",
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
        "group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(20,20,60,0.04),0_4px_16px_-8px_rgba(20,20,60,0.08)] transition-all",
        href &&
          "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]",
        emphasis && "sm:p-6",
      )}
    >
      {/* Subtle top gradient accent */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          tone === "primary" && "bg-gradient-to-r from-transparent via-primary/30 to-transparent",
          tone === "success" && "bg-gradient-to-r from-transparent via-success/30 to-transparent",
          tone === "warning" && "bg-gradient-to-r from-transparent via-warning/30 to-transparent",
          tone === "danger" && "bg-gradient-to-r from-transparent via-destructive/30 to-transparent",
          tone === "neutral" && "bg-gradient-to-r from-transparent via-border to-transparent",
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl ring-1",
            emphasis ? "size-11" : "size-10",
            t.bg,
            t.text,
            t.ring,
          )}
        >
          <Icon className={emphasis ? "size-5" : "size-[18px]"} />
        </span>
        {href && (
          <ArrowUpRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground/60 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100 rtl:group-hover:-translate-x-0.5",
            )}
          />
        )}
      </div>

      <div className="space-y-1">
        <p className={cn("text-xs font-medium text-muted-foreground")}>
          {label}
        </p>
        <p
          className={cn(
            "font-heading font-bold leading-none tabular-nums",
            emphasis ? "text-[32px]" : "text-2xl",
            t.number,
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>

      {action && (
        <div className="border-t border-border/50 pt-3 text-xs">{action}</div>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}
