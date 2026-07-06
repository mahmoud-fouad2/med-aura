"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Lock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sendCaseMessage } from "@/lib/actions/conversation"
import type { CaseConversationView } from "@/lib/data/conversations"

export function ConversationPanel({
  caseId,
  conversation,
  currentUserId,
  canWriteInternalNote,
}: {
  caseId: string
  conversation: CaseConversationView
  currentUserId: string
  canWriteInternalNote: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [asInternalNote, setAsInternalNote] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSend() {
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    const res = await sendCaseMessage({ caseId, body, isInternalNote: asInternalNote })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setBody("")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <MessageSquare className="size-5 text-primary" /> المحادثة
      </h2>

      {conversation.messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد رسائل بعد.</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto">
          {conversation.messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg p-3 text-sm ${
                m.isInternalNote
                  ? "border border-dashed border-warning/50 bg-warning/10"
                  : m.senderUserId === currentUserId
                    ? "bg-primary/10"
                    : "bg-muted/50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {m.senderName}
                  {m.isInternalNote && (
                    <span className="mr-2 inline-flex items-center gap-1 text-xs text-warning">
                      <Lock className="size-3" /> ملاحظة داخلية
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-foreground">{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          rows={2}
          placeholder="اكتب رسالتك…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {canWriteInternalNote ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={asInternalNote} onChange={(e) => setAsInternalNote(e.target.checked)} />
              ملاحظة داخلية (لا يراها المريض)
            </label>
          ) : (
            <span />
          )}
          <Button size="sm" disabled={busy || !body.trim()} onClick={onSend}>
            <Send className="size-4" /> إرسال
          </Button>
        </div>
      </div>
    </div>
  )
}
