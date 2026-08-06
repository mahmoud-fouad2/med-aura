import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MetricTileTone = "primary" | "success" | "warning" | "danger" | "neutral"

const TONE_ICON: Record<MetricTileTone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
}

const TONE_VALUE: Record<MetricTileTone, string> = {
  primary: "text-foreground",
  success: "text-foreground",
  warning: "text-warning-foreground",
  danger: "text-destructive",
  neutral: "text-foreground",
}

/** Flat bordered metric tile — no shadow/glow/icon-circle, unlike components/dashboard/metric-card.tsx. */
export function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "primary",
  emphasis = false,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  href?: string
  tone?: MetricTileTone
  emphasis?: boolean
}) {
  const body = (
    <div
      className={cn(
        "group flex flex-col justify-between gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors",
        href && "hover:bg-muted/30",
        emphasis && "sm:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon className={cn(emphasis ? "size-5" : "size-4", TONE_ICON[tone])} />
        {href && (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "font-heading font-bold leading-none tabular-nums",
            emphasis ? "text-[28px]" : "text-2xl",
            TONE_VALUE[tone],
          )}
        >
          {value}
        </p>
        {hint && <p className="pt-1 text-[11px] leading-snug text-muted-foreground/80">{hint}</p>}
      </div>
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
