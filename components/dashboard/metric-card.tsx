import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MetricTone = "primary" | "success" | "warning" | "danger" | "neutral"

const TONE: Record<
  MetricTone,
  { bg: string; text: string; ring: string; number: string; shadow: string }
> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
    number: "text-foreground",
    shadow: "hover:shadow-[0_4px_20px_-4px_rgba(74,29,150,0.15)]",
  },
  success: {
    bg: "bg-success/12",
    text: "text-success",
    ring: "ring-success/20",
    number: "text-foreground",
    shadow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]",
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning-foreground",
    ring: "ring-warning/22",
    number: "text-warning-foreground",
    shadow: "hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)]",
  },
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    ring: "ring-destructive/20",
    number: "text-destructive",
    shadow: "hover:shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)]",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
    number: "text-foreground",
    shadow: "hover:shadow-[0_4px_20px_-4px_rgba(100,116,139,0.12)]",
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
        "group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 backdrop-blur-sm transition-all duration-300",
        href
          ? cn("hover:-translate-y-1 hover:border-primary/30", t.shadow)
          : "shadow-[0_1px_2px_rgba(20,20,60,0.02),0_4px_16px_-8px_rgba(20,20,60,0.06)]",
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
          <Icon className={emphasis ? "size-5" : "size-[18px]"} />
        </span>
        {href && (
          <ArrowUpRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground/60 opacity-0 -translate-y-0.5 translate-x-0.5 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-primary group-hover:opacity-100",
            )}
          />
        )}
      </div>

      <div className="space-y-1">
        <p className={cn("text-xs font-semibold text-muted-foreground/90")}>
          {label}
        </p>
        <p
          className={cn(
            "font-heading font-extrabold leading-none tracking-tight tabular-nums",
            emphasis ? "text-[32px] sm:text-[34px]" : "text-2xl sm:text-[26px]",
            t.number,
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="pt-1.5 text-[11px] leading-snug text-muted-foreground/80 font-medium">
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
