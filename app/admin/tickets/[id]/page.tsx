import { notFound } from "next/navigation"
import { requirePermissionPage, requireUser } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { getTicketDetail } from "@/lib/data/support-tickets"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { TicketThread } from "@/components/support/ticket-thread"
import { TicketStatusSelect } from "@/components/admin/ticket-status-select"
import { ticketCategoryAr, ticketStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "تذكرة دعم" }

function statusTone(status: string): StatusTone {
  if (status === "OPEN") return "info"
  if (status === "IN_PROGRESS") return "warning"
  if (status === "RESOLVED" || status === "CLOSED") return "success"
  return "neutral"
}

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermissionPage(PERMISSIONS.SUPPORT_MANAGE)
  const user = await requireUser()
  const { id } = await params

  const ticket = await getTicketDetail(id, user.id, true)
  if (!ticket) notFound()

  const requester = ticket.participants[0]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="التواصل" title={ticket.subject} description={requester ? `مقدّم التذكرة: ${requester.name}` : undefined} />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={statusTone(ticket.status)} label={ticketStatusAr(ticket.status)} />
        <span className="text-xs text-muted-foreground">{ticketCategoryAr(ticket.category)}</span>
        <TicketStatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
      </div>

      <Card className="p-6">
        <TicketThread ticketId={ticket.id} messages={ticket.messages} currentUserId={user.id} closed={ticket.status === "CLOSED"} />
      </Card>
    </div>
  )
}
