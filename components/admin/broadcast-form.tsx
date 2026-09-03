"use client"

import { useState } from "react"
import { Megaphone } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { sendBroadcastAction } from "@/lib/actions/broadcast"
import { BROADCAST_AUDIENCES, type BroadcastAudience } from "@/lib/broadcast"

const AUDIENCE_LABEL: Record<BroadcastAudience, string> = {
  all: "كل الأعضاء",
  patients: "المرضى فقط",
  doctors: "الأطباء فقط",
}

export function BroadcastForm() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<BroadcastAudience>("all")
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSend = title.trim().length >= 3 && body.trim().length >= 3

  async function send() {
    setError(null)
    const res = await sendBroadcastAction({ title, body, audience })
    if (!res.ok) {
      setError(res.error)
      return false
    }
    setSentCount(res.data!.recipientCount)
    setTitle("")
    setBody("")
    return true
  }

  return (
    <Card className="max-w-xl space-y-5 p-6">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">العنوان</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: عرض خاص هذا الأسبوع"
          maxLength={120}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">نص الرسالة</span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="اكتب نص الإشعار الذي سيصل للأعضاء…"
          maxLength={500}
        />
      </label>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">الفئة المستهدفة</label>
        <div className="flex flex-wrap gap-2">
          {BROADCAST_AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                audience === a
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-muted"
              }`}
            >
              {AUDIENCE_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {sentCount != null && (
        <p className="text-sm font-medium text-emerald-600">
          تم الإرسال إلى {sentCount.toLocaleString("ar-SA-u-nu-latn")} عضوًا.
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="إرسال إشعار جماعي؟"
        description={`سيصل هذا الإشعار فورًا إلى: ${AUDIENCE_LABEL[audience]}. لا يمكن التراجع بعد الإرسال.`}
        confirmLabel="إرسال"
        tone="destructive"
        onConfirm={send}
      />
      <Button type="button" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
        <Megaphone className="size-4" /> إرسال الإشعار
      </Button>
    </Card>
  )
}
