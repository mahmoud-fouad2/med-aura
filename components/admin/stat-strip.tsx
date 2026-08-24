import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Stat = {
  key: string
  label: string
  value: string
  description: string
  icon?: LucideIcon
  href?: string
  tone?: "neutral" | "danger" | "success" | "warning"
}

const TONE: Record<NonNullable<Stat["tone"]>, { value: string; icon: string }> = {
  neutral: { value: "text-foreground", icon: "text-primary" },
  danger: { value: "text-destructive", icon: "text-destructive" },
  success: { value: "text-success", icon: "text-success" },
  warning: { value: "text-warning", icon: "text-warning" },
}

/**
 * Core metrics as one bordered strip split by internal dividers — not N
 * separate shadowed cards. No icon circles, no per-stat shadow. Height is
 * earned by real content, not an arbitrary fixed box.
 *
 * The icon sits inline with the label rather than in a tinted badge: it gives
 * each cell something to anchor on at a glance without adding a second
 * container. A zero value never gets the alert tone (danger/warning) — it
 * reads calm, the same visual weight as every other quiet number.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const tone = TONE[s.tone ?? "neutral"]
        const content = (
          <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-5 shadow-elegant transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant-lg">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/10 via-primary/70 to-gold/80" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "mt-3 font-heading text-[34px] font-bold tabular-nums leading-none",
                    tone.value,
                  )}
                >
                  {s.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.description}</p>
              </div>
              {s.icon && (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary shadow-sm">
                  <s.icon className={cn("size-5", tone.icon)} />
                </span>
              )}
            </div>
          </div>
        )
        return s.href ? (
          <Link key={s.key} href={s.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={s.key}>{content}</div>
        )
      })}
    </div>
  )
}
