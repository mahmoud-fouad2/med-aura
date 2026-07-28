"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateTicketStatus } from "@/lib/actions/support-tickets"
import { TICKET_STATUSES } from "@/lib/support-ticket-constants"
import { ticketStatusAr } from "@/lib/status-labels"

export function TicketStatusSelect({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [value, setValue] = useState(currentStatus)

  async function onChange(next: string) {
    setValue(next)
    setBusy(true)
    const res = await updateTicketStatus({ ticketId, status: next as (typeof TICKET_STATUSES)[number] })
    setBusy(false)
    if (res.ok) {
      router.refresh()
    } else {
      setValue(currentStatus)
      toast.error(res.error)
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground disabled:opacity-50"
      aria-label="حالة التذكرة"
    >
      {TICKET_STATUSES.map((s) => (
        <option key={s} value={s}>{ticketStatusAr(s)}</option>
      ))}
    </select>
  )
}
