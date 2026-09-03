"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, CheckCircle2, Mail, RotateCcw, Send } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { setContactMessageStatusAction, replyToContactMessageAction } from "@/lib/actions/admin-support"
import { dtfMedium } from "@/lib/format"
import type { AdminContactMessageRow } from "@/lib/data/admin-support"

function statusTone(status: string): StatusTone {
  if (status === "new") return "warning"
  if (status === "archived") return "neutral"
  return "info"
}
function statusLabel(status: string): string {
  if (status === "new") return "جديدة"
  if (status === "archived") return "مؤرشفة"
  return "مقروءة"
}

export function ContactMessageTable({ rows, emailConfigured }: { rows: AdminContactMessageRow[]; emailConfigured: boolean }) {
  const [selected, setSelected] = useState<AdminContactMessageRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(m) => m.id}
        onRowClick={setSelected}
        columns={[
          {
            header: "المرسل",
            mobile: "title",
            cell: (m) => (
              <div>
                <p className="font-medium text-foreground">{m.name}</p>
                <p dir="ltr" className="text-xs text-muted-foreground">{m.email}</p>
              </div>
            ),
          },
          { header: "الموضوع", cell: (m) => <span className="line-clamp-1">{m.subject}</span> },
          {
            header: "الحالة",
            mobile: "badge",
            cell: (m) => (
              <div className="flex items-center gap-1.5">
                <StatusBadge tone={statusTone(m.status)} label={statusLabel(m.status)} />
                {m.repliedAt && <StatusBadge tone="success" label="تم الرد" />}
              </div>
            ),
          },
          { header: "التاريخ", cell: (m) => <span className="text-xs text-muted-foreground">{dtfMedium(m.createdAt)}</span> },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected ? (
            <MessageDetail message={selected} emailConfigured={emailConfigured} onChanged={() => setSelected(null)} />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function MessageDetail({
  message,
  emailConfigured,
  onChanged,
}: {
  message: AdminContactMessageRow
  emailConfigured: boolean
  onChanged: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [replyPending, startReply] = useTransition()
  const [replyError, setReplyError] = useState<string | null>(null)

  function sendReply() {
    setReplyError(null)
    startReply(async () => {
      const res = await replyToContactMessageAction({ id: message.id, body: replyBody })
      if (res.ok) {
        toast.success("تم إرسال الرد بالبريد الإلكتروني.")
        setReplying(false)
        setReplyBody("")
        router.refresh()
      } else {
        setReplyError(res.error)
      }
    })
  }

  // Opening a "new" message marks it read — standard inbox behavior, not a
  // separate click the agent has to remember to make.
  useEffect(() => {
    if (message.status !== "new") return
    void setContactMessageStatusAction({ id: message.id, status: "read" }).then((res) => {
      if (res.ok) router.refresh()
    })
  }, [message.id, message.status, router])

  function setStatus(status: "read" | "archived") {
    start(async () => {
      const res = await setContactMessageStatusAction({ id: message.id, status })
      if (res.ok) {
        toast.success(status === "archived" ? "تمت الأرشفة." : "تم إلغاء الأرشفة.")
        router.refresh()
        if (status === "archived") onChanged()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{message.subject}</SheetTitle>
        <SheetDescription>
          <StatusBadge tone={statusTone(message.status)} label={statusLabel(message.status)} />
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
        <div className="space-y-1.5 rounded-lg border border-border/60 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-medium text-foreground">{message.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">البريد الإلكتروني</span>
            <a href={`mailto:${message.email}`} dir="ltr" className="font-medium text-primary hover:underline">
              {message.email}
            </a>
          </div>
          {message.phone ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">الهاتف</span>
              <span dir="ltr" className="font-medium text-foreground">{message.phone}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">تاريخ الإرسال</span>
            <span className="font-medium text-foreground">{dtfMedium(message.createdAt)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">الرسالة</p>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="whitespace-pre-wrap text-sm text-foreground">{message.message}</p>
          </div>
        </div>

        {message.repliedAt && (
          <p className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="size-3.5" /> تم الرد بتاريخ {dtfMedium(message.repliedAt)}
          </p>
        )}

        {replying && (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p id={`reply-to-${message.id}`} className="text-xs font-medium text-foreground">الرد إلى {message.email}</p>
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              placeholder="اكتب ردك هنا…"
              aria-labelledby={`reply-to-${message.id}`}
              autoFocus
            />
            {replyError && <p className="text-xs text-destructive">{replyError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={replyPending} onClick={() => setReplying(false)}>
                إلغاء
              </Button>
              <Button size="sm" loading={replyPending} disabled={replyBody.trim().length < 3} onClick={sendReply}>
                <Send className="size-4" /> إرسال الرد
              </Button>
            </div>
          </div>
        )}
      </div>

      <SheetFooter>
        {emailConfigured ? (
          <Button variant="outline" size="sm" onClick={() => setReplying((v) => !v)}>
            <Send className="size-4" /> رد من داخل النظام
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          render={<a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`} />}
        >
          <Mail className="size-4" /> الرد ببرنامج البريد
        </Button>
        {message.status === "archived" ? (
          <Button size="sm" variant="outline" loading={pending} onClick={() => setStatus("read")}>
            <RotateCcw className="size-4" /> إلغاء الأرشفة
          </Button>
        ) : (
          <Button size="sm" loading={pending} onClick={() => setStatus("archived")}>
            <Archive className="size-4" /> أرشفة
          </Button>
        )}
        {message.status === "read" ? (
          <span className="inline-flex items-center gap-1 self-center text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" /> مقروءة
          </span>
        ) : null}
      </SheetFooter>
    </>
  )
}
