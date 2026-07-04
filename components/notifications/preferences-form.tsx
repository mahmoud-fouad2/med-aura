"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, Mail, MessageSquare, Phone, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  updatePreferencesAction,
  type PreferencesRow,
} from "@/lib/actions/notification-preferences"
import type { ChannelAvailability } from "@/lib/notifications/channels"

type ChannelKey = "inApp" | "email" | "sms" | "whatsapp"

const CHANNELS: {
  key: ChannelKey
  name: string
  fieldName: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  needsPhone: boolean
}[] = [
  {
    key: "inApp",
    name: "داخل التطبيق",
    fieldName: "inAppEnabled",
    icon: Bell,
    description: "الإشعارات التي تظهر في صندوق الوارد داخل Med Aura.",
    needsPhone: false,
  },
  {
    key: "email",
    name: "البريد الإلكتروني",
    fieldName: "emailEnabled",
    icon: Mail,
    description: "ملخصات وتنبيهات مهمة ترسل إلى بريدك المسجّل.",
    needsPhone: false,
  },
  {
    key: "sms",
    name: "الرسائل النصية SMS",
    fieldName: "smsEnabled",
    icon: Phone,
    description: "تذكيرات قصيرة قبل المواعيد والدفعات.",
    needsPhone: true,
  },
  {
    key: "whatsapp",
    name: "واتساب",
    fieldName: "whatsappEnabled",
    icon: MessageSquare,
    description: "رسائل واتساب رسمية عبر قوالب معتمدة فقط.",
    needsPhone: true,
  },
]

export function PreferencesForm({
  initial,
  availability,
}: {
  initial: PreferencesRow
  availability: ChannelAvailability
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await updatePreferencesAction(fd)
      if (res.status === "ok") {
        toast.success("تم حفظ تفضيلات الإشعارات.")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {CHANNELS.map((ch) => {
        const enabled = availability[ch.key]
        const defaultOn =
          ch.key === "inApp"
            ? initial.inAppEnabled
            : ch.key === "email"
              ? initial.emailEnabled
              : ch.key === "sms"
                ? initial.smsEnabled
                : initial.whatsappEnabled
        const defaultPhone =
          ch.key === "sms"
            ? (initial.smsPhone ?? "")
            : ch.key === "whatsapp"
              ? (initial.whatsappPhone ?? "")
              : ""
        return (
          <Card key={ch.key} className="p-5">
            <div className="flex items-start gap-4">
              <span
                className={
                  "flex size-11 shrink-0 items-center justify-center rounded-xl " +
                  (enabled
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground")
                }
              >
                <ch.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-foreground">
                    {ch.name}
                  </h3>
                  {!enabled && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
                      غير مهيأة على المنصة
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {ch.description}
                </p>

                {ch.needsPhone && (
                  <div className="mt-3 max-w-sm">
                    <label className="block text-xs font-medium text-muted-foreground">
                      رقم الاتصال (اختياري — إن اختلف عن رقمك المسجّل)
                    </label>
                    <Input
                      name={ch.key === "sms" ? "smsPhone" : "whatsappPhone"}
                      defaultValue={defaultPhone}
                      dir="ltr"
                      className="mt-1"
                      placeholder="+9665XXXXXXXX"
                      disabled={!enabled}
                    />
                  </div>
                )}
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  name={ch.fieldName}
                  defaultChecked={enabled && defaultOn}
                  disabled={!enabled}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-disabled:opacity-40" />
                <span className="pointer-events-none absolute top-0.5 start-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
              </label>
            </div>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} loadingText="جارٍ الحفظ…">
          <Save className="size-4" />
          حفظ التفضيلات
        </Button>
      </div>
    </form>
  )
}
