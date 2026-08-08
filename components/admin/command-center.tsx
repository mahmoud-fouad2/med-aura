import Link from "next/link"
import { AlertTriangle, CheckCircle2, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export type AttentionTone = "critical" | "routine"

export type AttentionItem = {
  key: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  /** What the count actually means / what happens next. Without this the row
   *  is a label at one edge and a number at the other with a gulf between. */
  description: string
  count: number
  href: string
  /** "critical" (safety/system failures — genuinely urgent) vs "routine"
   *  (normal operational backlog like pending applications). Only critical
   *  items get red; the panel itself is always neutral either way. */
  tone?: AttentionTone
}

const ITEM_TONE: Record<AttentionTone, { icon: string; count: string; rail: string; pill: string }> = {
  critical: { icon: "text-destructive", count: "text-destructive", rail: "bg-destructive", pill: "bg-destructive/10 text-destructive" },
  routine: { icon: "text-primary", count: "text-foreground", rail: "bg-primary/50", pill: "bg-primary/10 text-primary" },
}

/**
 * "What needs my attention right now" — a lean, always-neutral panel, not a
 * heavy card wholesale-tinted red. Only items with a non-zero count reach this
 * list, so nothing here needs "view all".
 *
 * Each row carries the count as a real number sitting next to its meaning,
 * with a one-line description underneath, rather than a badge exiled to the
 * far edge with dead space in between. Urgency is signalled by a hairline rail
 * on the leading edge plus the icon and number colour — never by tinting the
 * whole row or the panel red.
 */
export function CommandCenter({ items }: { items: AttentionItem[] }) {
  const hasItems = items.length > 0
  const criticalCount = items.filter((i) => i.tone === "critical").length
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-card/88 shadow-elegant">
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
        {criticalCount > 0 ? (
          <AlertTriangle className="size-[18px] shrink-0 text-destructive" />
        ) : (
          <CheckCircle2
            className={cn("size-[18px] shrink-0", hasItems ? "text-primary" : "text-success")}
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">يحتاج إلى انتباه</h2>
          <p className="truncate text-sm text-muted-foreground">
            {criticalCount > 0
              ? `${criticalCount.toLocaleString("ar-SA-u-nu-latn")} منها حرجة — مرتّبة حسب الأولوية`
              : hasItems
                ? "عمل تشغيلي معتاد — مرتّب حسب الأولوية"
                : "كل شيء تحت السيطرة"}
          </p>
        </div>
        {hasItems && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {items.length.toLocaleString("ar-SA-u-nu-latn")}
          </span>
        )}
      </div>
      {hasItems ? (
        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const t = ITEM_TONE[item.tone ?? "routine"]
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group relative flex min-h-16 items-center gap-3 py-3 pe-5 ps-5 transition-colors hover:bg-background/70"
                >
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0 start-0 w-[3px]", t.rail)}
                  />
                  <item.icon className={cn("size-5 shrink-0", t.icon)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex min-w-10 shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      t.pill,
                    )}
                  >
                    {item.count.toLocaleString("ar-SA-u-nu-latn")}
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          لا توجد عناصر تحتاج تدخلًا الآن — كل الطوابير التشغيلية فارغة.
        </p>
      )}
    </div>
  )
}
