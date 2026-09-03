"use client"

import { useState, useTransition } from "react"
import { Check, EyeOff, Star, X } from "lucide-react"
import { toast } from "sonner"
import { moderateReview } from "@/lib/actions/review"
import type { PendingReview } from "@/lib/data/admin-reviews"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ReviewModeration({ rows }: { rows: PendingReview[] }) {
  const [visible, setVisible] = useState(rows)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function decide(reviewId: string, decision: "publish" | "hide" | "reject") {
    setBusyId(reviewId)
    startTransition(async () => {
      const result = await moderateReview({ reviewId, decision, reason: reasons[reviewId] ?? "" })
      setBusyId(null)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setVisible((current) => current.filter((row) => row.id !== reviewId))
      toast.success("تم تحديث حالة التقييم.")
    })
  }

  if (visible.length === 0) {
    return <p className="rounded-lg border border-border/60 bg-card px-5 py-10 text-center text-sm text-muted-foreground">لا توجد تقييمات نصية بانتظار المراجعة.</p>
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
      {visible.map((row) => (
        <li key={row.id} className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-heading text-sm font-bold">{row.anonymousDisplay ? "مريض موثّق" : row.patientName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{[row.doctorName, row.centerName].filter(Boolean).join(" · ") || "مقدم الخدمة"}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums"><Star className="size-4 fill-current text-gold" /> {row.overallRating}/5</span>
          </div>
          <p className="rounded-md bg-muted/35 px-4 py-3 text-sm leading-relaxed">{row.comment}</p>
          <Textarea rows={2} value={reasons[row.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="سبب الإخفاء أو الرفض (يوصى به عند عدم النشر)" aria-label="سبب الإخفاء أو الرفض" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busyId === row.id} onClick={() => decide(row.id, "publish")}><Check className="size-4" /> نشر</Button>
            <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => decide(row.id, "hide")}><EyeOff className="size-4" /> إخفاء</Button>
            <Button size="sm" variant="destructive" disabled={busyId === row.id} onClick={() => decide(row.id, "reject")}><X className="size-4" /> رفض</Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
