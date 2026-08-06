import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AttentionTone = "critical" | "routine"

export type AttentionItem = {
  key: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  href: string
  /** "critical" (safety/system failures — genuinely urgent) vs "routine"
   *  (normal operational backlog like pending applications). Only critical
   *  items get red; the panel itself is always neutral either way. */
  tone?: AttentionTone
}

const ITEM_TONE: Record<AttentionTone, { icon: string; badge: "destructive" | "secondary" }> = {
  critical: { icon: "text-destructive", badge: "destructive" },
  routine: { icon: "text-primary", badge: "secondary" },
}

/**
 * "What needs my attention right now" — a lean, always-neutral panel, not
 * a heavy card wholesale-tinted red. Only items with a non-zero count ever
 * reach this list, so nothing here needs "view all". Red is reserved for
 * individual critical rows (safety/system), never the panel background.
 */
export function CommandCenter({ items }: { items: AttentionItem[] }) {
  const hasItems = items.length > 0
  const hasCritical = items.some((i) => i.tone === "critical")
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
        {hasCritical ? (
          <AlertTriangle className="size-[18px] shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className={cn("size-[18px] shrink-0", hasItems ? "text-primary" : "text-success")} />
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">يحتاج إلى انتباه</h2>
          <p className="truncate text-xs text-muted-foreground">
            {hasItems ? "مرتّبًا حسب الأولوية" : "كل شيء تحت السيطرة"}
          </p>
        </div>
      </div>
      {hasItems ? (
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const t = ITEM_TONE[item.tone ?? "routine"]
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <item.icon className={cn("size-[18px] shrink-0", t.icon)} />
                    <span className="truncate font-semibold text-foreground">{item.label}</span>
                  </span>
                  <Badge variant={t.badge} className="shrink-0">{item.count.toLocaleString("ar-SA-u-nu-latn")}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">لا توجد عناصر تحتاج تدخلًا الآن.</p>
      )}
    </div>
  )
}
