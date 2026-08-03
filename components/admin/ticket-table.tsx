import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { ticketStatusAr, ticketCategoryAr } from "@/lib/status-labels"
import type { AdminTicketRow } from "@/lib/data/support-tickets"

function statusTone(status: string): StatusTone {
  if (status === "OPEN") return "info"
  if (status === "IN_PROGRESS") return "warning"
  if (status === "RESOLVED" || status === "CLOSED") return "success"
  return "neutral"
}

export function AdminTicketTable({ rows }: { rows: AdminTicketRow[] }) {
  return (
    <DataTable
      rows={rows}
      getRowKey={(t) => t.id}
      columns={[
        {
          header: "العنوان",
          mobile: "title",
          cell: (t) => <span className="font-medium text-foreground">{t.subject}</span>,
        },
        {
          header: "مقدّم التذكرة",
          cell: (t) => <span className="text-muted-foreground">{t.patientName}</span>,
        },
        {
          header: "الحالة",
          mobile: "badge",
          cell: (t) => <StatusBadge tone={statusTone(t.status)} label={ticketStatusAr(t.status)} />,
        },
        {
          header: "التصنيف",
          cell: (t) => <span className="text-muted-foreground">{ticketCategoryAr(t.category)}</span>,
        },
        {
          header: "آخر نشاط",
          cell: (t) => (
            <span className="whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
              {new Date(t.lastMessageAt).toLocaleString("ar-SA-u-nu-latn")}
            </span>
          ),
        },
      ]}
      actions={(t) => (
        <Link
          href={`/admin/tickets/${t.id}`}
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          فتح
          <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
        </Link>
      )}
    />
  )
}
