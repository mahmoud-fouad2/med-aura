import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
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
    <>
      <div className="space-y-2 p-3 sm:hidden">
        {rows.map((t) => (
          <MobileDataCard
            key={t.id}
            title={t.subject}
            subtitle={t.patientName}
            badge={<StatusBadge tone={statusTone(t.status)} label={ticketStatusAr(t.status)} />}
            rows={[
              { label: "التصنيف", value: ticketCategoryAr(t.category) },
              { label: "آخر نشاط", value: new Date(t.lastMessageAt).toLocaleDateString("ar-SA-u-nu-latn") },
            ]}
            actions={
              <Link href={`/admin/tickets/${t.id}`} className="text-xs font-medium text-primary hover:underline">
                فتح
              </Link>
            }
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
              <Th>الحالة</Th>
              <Th>العنوان</Th>
              <Th>مقدّم التذكرة</Th>
              <Th>التصنيف</Th>
              <Th>آخر نشاط</Th>
              <Th>—</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-muted/25">
                <td className="px-4 py-3">
                  <StatusBadge tone={statusTone(t.status)} label={ticketStatusAr(t.status)} />
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{t.subject}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.patientName}</td>
                <td className="px-4 py-3 text-muted-foreground">{ticketCategoryAr(t.category)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                  {new Date(t.lastMessageAt).toLocaleString("ar-SA-u-nu-latn")}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/tickets/${t.id}`} className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    فتح
                    <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium tracking-wide">{children}</th>
}
