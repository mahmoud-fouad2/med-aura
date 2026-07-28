import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { getTicketDetail } from "@/lib/data/support-tickets"
import { Card } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { TicketThread } from "@/components/support/ticket-thread"
import { ticketStatusAr, ticketCategoryAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

function statusTone(status: string): StatusTone {
  if (status === "OPEN") return "info"
  if (status === "IN_PROGRESS") return "warning"
  if (status === "RESOLVED" || status === "CLOSED") return "success"
  return "neutral"
}

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = (await getCurrentUser())!
  const ticket = await getTicketDetail(id, user.id)
  if (!ticket) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" /> الدعم
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-bold text-foreground">{ticket.subject}</h1>
          <StatusBadge tone={statusTone(ticket.status)} label={ticketStatusAr(ticket.status)} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ticketCategoryAr(ticket.category)} · فُتحت في {new Date(ticket.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
        </p>
      </div>

      <Card className="p-6">
        <TicketThread
          ticketId={ticket.id}
          messages={ticket.messages}
          currentUserId={user.id}
          closed={ticket.status === "CLOSED"}
        />
      </Card>
    </div>
  )
}
