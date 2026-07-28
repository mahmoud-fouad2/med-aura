"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { markTicketRead, replyToTicket } from "@/lib/actions/support-tickets"
import type { TicketMessageView } from "@/lib/data/support-tickets"

export function TicketThread({
  ticketId,
  messages,
  currentUserId,
  closed,
}: {
  ticketId: string
  messages: TicketMessageView[]
  currentUserId: string
  closed: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void markTicketRead(ticketId)
  }, [ticketId])

  async function onSend() {
    if (!body.trim()) return
    setPending(true)
    setError(null)
    const res = await replyToTicket({ ticketId, body })
    setPending(false)
    if (!res.ok) return setError(res.error)
    setBody("")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد رسائل بعد.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg p-3 text-sm ${m.senderUserId === currentUserId ? "bg-primary/10" : "bg-muted/50"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{m.senderName}</span>
                <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("ar-SA-u-nu-latn")}</span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      {closed ? (
        <p className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
          هذه التذكرة مغلقة. إذا احتجت مساعدة إضافية، افتح تذكرة جديدة.
        </p>
      ) : (
        <div className="space-y-2">
          <Textarea rows={3} placeholder="اكتب ردك…" value={body} onChange={(e) => setBody(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" disabled={pending || !body.trim()} onClick={onSend} loading={pending}>
              <Send className="size-4" /> إرسال
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
