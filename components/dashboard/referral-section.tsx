"use client"

import { useState } from "react"
import { Copy, Check, Share2, Users, Gift } from "lucide-react"
import type { MyReferralData } from "@/lib/actions/referral"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function formatReward(type: "PERCENTAGE" | "FIXED", value: string, currency: string): string {
  return type === "PERCENTAGE" ? `خصم ${value}%` : `${value} ${currency}`
}

export function ReferralSection({ data }: { data: MyReferralData }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text)
      if (which === "code") {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
      } else {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      }
    } catch {
      // Clipboard API unavailable — the code/link is already visible on screen.
    }
  }

  async function shareNative() {
    if (typeof navigator === "undefined" || !navigator.share) return
    try {
      await navigator.share({
        title: "Med Aura",
        text: `انضمّي إلى Med Aura باستخدام كود دعوتي ${data.code} واحصلي على مكافأة عند أول استشارة.`,
        url: data.shareUrl,
      })
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  if (!data.programActive) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">برنامج الدعوات غير مفعّل حاليًا. تابعينا لمعرفة موعد إطلاقه.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Gift className="size-4.5 text-primary" />
          {formatReward(data.referrerRewardType, data.referrerRewardValue, data.currency)} لكِ، و
          {" "}
          {formatReward(data.refereeRewardType, data.refereeRewardValue, data.currency)} لصديقتك — عند أول استشارة مدفوعة تحجزها بكودك.
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">كود دعوتك</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-center font-heading text-xl font-bold tracking-[0.2em] text-primary">
              {data.code}
            </div>
            <Button variant="outline" size="icon" onClick={() => void copy(data.code, "code")} aria-label="نسخ الكود">
              {copiedCode ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">رابط الدعوة</span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              dir="ltr"
              value={data.shareUrl}
              className="h-10 flex-1 truncate rounded-lg border border-input bg-muted/40 px-3 text-xs text-muted-foreground"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="outline" size="icon" onClick={() => void copy(data.shareUrl, "link")} aria-label="نسخ الرابط">
              {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>

        <Button className="w-full" onClick={() => void shareNative()}>
          <Share2 className="size-4" />
          مشاركة الدعوة
        </Button>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div className="flex flex-1 items-center justify-around gap-4 text-center">
          <div>
            <p className="font-heading text-xl font-bold text-foreground">{data.invitedCount.toLocaleString("ar-SA-u-nu-latn")}</p>
            <p className="text-xs text-muted-foreground">دعوات أُرسلت</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="font-heading text-xl font-bold text-foreground">{data.rewardedCount.toLocaleString("ar-SA-u-nu-latn")}</p>
            <p className="text-xs text-muted-foreground">مكافآت مكتسبة</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
