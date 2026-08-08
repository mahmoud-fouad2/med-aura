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
  neutral: { value: "text-foreground", icon: "text-muted-foreground" },
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
    <div className="grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 rtl:divide-x-reverse sm:grid-cols-4 sm:divide-y-0">
      {stats.map((s) => {
        const tone = TONE[s.tone ?? "neutral"]
        const content = (
          <div className="flex h-full flex-col justify-center gap-2 px-5 py-5">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {s.icon && <s.icon className={cn("size-4 shrink-0", tone.icon)} />}
              <span className="truncate">{s.label}</span>
            </p>
            <p
              className={cn(
                "font-heading text-[32px] font-bold tabular-nums leading-none",
                tone.value,
              )}
            >
              {s.value}
            </p>
            <p className="truncate text-xs text-muted-foreground">{s.description}</p>
          </div>
        )
        return s.href ? (
          <Link key={s.key} href={s.href} className="transition-colors hover:bg-muted/40">
            {content}
          </Link>
        ) : (
          <div key={s.key}>{content}</div>
        )
      })}
    </div>
  )
}
