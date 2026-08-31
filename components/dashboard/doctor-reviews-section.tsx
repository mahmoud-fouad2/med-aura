"use client"

import { useState } from "react"
import { Loader2, MessageCircle, Send } from "lucide-react"
import { respondToReviewAction } from "@/lib/actions/review"
import type { MyReviewRow } from "@/lib/actions/review"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Locale } from "@/lib/i18n"

const COPY = {
  ar: {
    title: "تقييمات المرضى",
    hint: "ردّك يظهر مباشرة أسفل تقييم المريض في صفحتك العامة.",
    empty: "لا توجد تقييمات منشورة بعد.",
    reply: "الرد على التقييم",
    edit: "تعديل الرد",
    placeholder: "اكتب ردًا مهنيًا ومختصرًا…",
    send: "إرسال الرد",
    sending: "جارٍ الإرسال…",
    cancel: "إلغاء",
    yourReply: "ردّك",
  },
  en: {
    title: "Patient Reviews",
    hint: "Your reply shows directly under the patient's review on your public page.",
    empty: "No published reviews yet.",
    reply: "Reply to review",
    edit: "Edit reply",
    placeholder: "Write a brief, professional reply…",
    send: "Send reply",
    sending: "Sending…",
    cancel: "Cancel",
    yourReply: "Your reply",
  },
} as const

type SectionCopy = (typeof COPY)["ar"] | (typeof COPY)["en"]

export function DoctorReviewsSection({ reviews, locale }: { reviews: MyReviewRow[]; locale: Locale }) {
  const t = COPY[locale]

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((rev) => (
            <ReviewItem key={rev.id} review={rev} t={t} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function ReviewItem({ review, t }: { review: MyReviewRow; t: SectionCopy }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(review.providerResponse ?? "")
  const [saved, setSaved] = useState(review.providerResponse)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError(null)
    const result = await respondToReviewAction({ reviewId: review.id, response: value })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSaved(value)
    setEditing(false)
  }

  return (
    <li className="border-b border-border/40 pb-5 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 text-warning-foreground">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={"size-2.5 rounded-full " + (i < review.rating ? "bg-current" : "bg-muted")}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {review.anonymous ? "—" : review.authorName}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85">{review.comment}</p>

      {saved && !editing ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-primary/5 px-3 py-2.5 text-sm">
            <p className="mb-1 text-xs font-semibold text-primary">{t.yourReply}</p>
            <p className="text-foreground/80">{saved}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setValue(saved)
              setEditing(true)
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t.edit}
          </button>
        </div>
      ) : editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={3}
            maxLength={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.placeholder}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={busy || !value.trim()} onClick={() => void save()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              {busy ? t.sending : t.send}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <MessageCircle className="size-3.5" />
          {t.reply}
        </button>
      )}
    </li>
  )
}
