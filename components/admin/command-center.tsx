import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AttentionItem = {
  key: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  href: string
}

/**
 * "What needs my attention right now" — a lean panel, not a heavy card.
 * Only items with a non-zero count ever reach this list, so nothing here
 * needs "view all" — the whole list is already everything that matters.
 * Rows are 52-58px; the count is a small badge, not its own visual block.
 */
export function CommandCenter({ items }: { items: AttentionItem[] }) {
  const hasItems = items.length > 0
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        hasItems ? "border-destructive/25 bg-destructive/[0.03]" : "border-border/60",
      )}
    >
      <div className="flex items-center gap-2 border-b border-inherit px-4 py-2.5">
        {hasItems ? (
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-success" />
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">يحتاج إلى انتباه</h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {hasItems ? "مرتّبًا حسب الأولوية" : "كل شيء تحت السيطرة"}
          </p>
        </div>
      </div>
      {hasItems ? (
        <ul className="divide-y divide-destructive/15">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex min-h-[54px] items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-destructive/5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <item.icon className="size-4 shrink-0 text-destructive" />
                  <span className="truncate font-medium text-foreground">{item.label}</span>
                </span>
                <Badge variant="destructive" className="shrink-0">{item.count.toLocaleString("ar-SA-u-nu-latn")}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">لا توجد عناصر تحتاج تدخلًا الآن.</p>
      )}
    </div>
  )
}
