import { History } from "lucide-react"
import { caseStatusAr } from "@/lib/status-labels"
import type { CaseTimelineEntry } from "@/lib/data/concierge"

export function CaseTimeline({ entries }: { entries: CaseTimelineEntry[] }) {
  if (entries.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <History className="size-5 text-primary" /> السجل الزمني
      </h2>
      <ol className="space-y-3 border-r-2 border-border pr-4">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute top-1.5 -right-[21px] size-2.5 rounded-full bg-primary" />
            <p className="text-sm font-medium text-foreground">
              {e.fromStatus ? `${caseStatusAr(e.fromStatus)} ← ` : ""}
              {caseStatusAr(e.toStatus)}
            </p>
            {e.note && <p className="text-sm text-muted-foreground">{e.note}</p>}
            <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("ar-SA-u-nu-latn")}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
