import Link from "next/link"
import { LifeBuoy, Plus } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listMyTickets } from "@/lib/data/support-tickets"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { ticketStatusAr, ticketCategoryAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "الدعم" }

function statusTone(status: string): StatusTone {
  if (status === "OPEN") return "info"
  if (status === "IN_PROGRESS") return "warning"
  if (status === "RESOLVED" || status === "CLOSED") return "success"
  return "neutral"
}

export default async function SupportPage() {
  const user = (await getCurrentUser())!
  const tickets = await listMyTickets(user.id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">الدعم</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تذاكرك مع فريق الدعم — افتح تذكرة جديدة لأي استفسار لا يخص حالة طبية محددة.
          </p>
        </div>
        <Button size="sm" render={<Link href="/dashboard/support/new"><Plus className="size-4" /> تذكرة جديدة</Link>} />
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="لا توجد تذاكر بعد"
          description="إذا احتجت مساعدة من فريق الدعم، افتح تذكرة جديدة وسنرد عليك في أقرب وقت."
        />
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/support/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{t.subject}</p>
                    {t.unreadForMe && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="غير مقروءة" />}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ticketCategoryAr(t.category)} · {new Date(t.lastMessageAt).toLocaleDateString("ar-SA-u-nu-latn")}
                  </p>
                </div>
                <StatusBadge tone={statusTone(t.status)} label={ticketStatusAr(t.status)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
