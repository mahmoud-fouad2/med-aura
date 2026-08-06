import Link from "next/link"
import { cn } from "@/lib/utils"

export type Stat = {
  key: string
  label: string
  value: string
  description: string
  href?: string
  tone?: "neutral" | "danger" | "success" | "warning"
}

const TONE_VALUE: Record<NonNullable<Stat["tone"]>, string> = {
  neutral: "text-foreground",
  danger: "text-destructive",
  success: "text-success",
  warning: "text-warning",
}

/**
 * Core metrics as one bordered strip split by internal dividers — not N
 * separate shadowed cards. No icon circles, no per-stat shadow. A zero
 * value never gets the alert tone (danger/warning) — it reads calm
 * (neutral or success), same visual weight as every other quiet number.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid h-[120px] grid-cols-2 divide-x divide-border/60 rounded-xl border border-border/60 rtl:divide-x-reverse sm:grid-cols-4">
      {stats.map((s) => {
        const content = (
          <div className="flex h-full flex-col justify-center px-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 font-heading text-2xl font-bold tabular-nums leading-none", TONE_VALUE[s.tone ?? "neutral"])}>{s.value}</p>
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground/80">{s.description}</p>
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
