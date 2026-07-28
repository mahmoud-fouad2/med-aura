"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { createSupportTicket } from "@/lib/actions/support-tickets"
import { TICKET_CATEGORIES, type TicketCategory } from "@/lib/support-ticket-constants"
import { ticketCategoryAr } from "@/lib/status-labels"

export function CreateTicketForm() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<TicketCategory>("OTHER")
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await createSupportTicket({ subject, category, body })
    setPending(false)
    if (!res.ok) return setError(res.error)
    router.push(`/dashboard/support/${res.data!.ticketId}`)
  }

  return (
    <Card className="space-y-4 p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">العنوان</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: مشكلة في الدفع" required maxLength={200} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">التصنيف</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>{ticketCategoryAr(c)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">تفاصيل المشكلة</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="اشرح المشكلة أو الاستفسار بالتفصيل…" required maxLength={5000} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" loading={pending} disabled={!subject.trim() || !body.trim()}>
          <Send className="size-4" /> إرسال التذكرة
        </Button>
      </form>
    </Card>
  )
}
