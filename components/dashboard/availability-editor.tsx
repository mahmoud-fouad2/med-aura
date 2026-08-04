"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Video, Building2, CalendarClock, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import {
  upsertMyAvailabilityRuleAction,
  deleteMyAvailabilityRuleAction,
} from "@/lib/actions/doctor"
import { dayOfWeekAr, appointmentTypeAr } from "@/lib/status-labels"
import { cn } from "@/lib/utils"
import type { AvailabilityRuleRow } from "@/lib/data/admin-directory"

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90]
type ConsultationType = "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
const CONSULTATION_TYPES: { value: ConsultationType; label: string; icon: typeof Video }[] = [
  { value: "VIDEO_CONSULTATION", label: "فيديو", icon: Video },
  { value: "IN_PERSON_CONSULTATION", label: "حضوري", icon: Building2 },
]

function fmtTime(t: string): string {
  return t.slice(0, 5)
}

export function AvailabilityEditor({ initialRules }: { initialRules: AvailabilityRuleRow[] }) {
  const byDay = new Map<number, AvailabilityRuleRow[]>()
  for (const day of DAYS) byDay.set(day, [])
  for (const rule of initialRules) byDay.get(rule.dayOfWeek)?.push(rule)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">الجدول الأسبوعي</h2>
        <AvailabilityRuleFormButton />
      </div>

      {initialRules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="لا توجد أوقات توفر مُحدَّدة بعد"
          description="أضف وقتًا من الأعلى ليتمكن المرضى من حجز استشارة معك."
        />
      ) : (
        <div className="divide-y divide-border">
          {DAYS.map((day) => {
            const rules = byDay.get(day) ?? []
            if (rules.length === 0) return null
            return (
              <div key={day} className="p-4">
                <p className="mb-2 text-xs font-bold text-muted-foreground">{dayOfWeekAr(day)}</p>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-3",
                        rule.active ? "border-border/60" : "border-border/40 opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {rule.type === "VIDEO_CONSULTATION" ? (
                          <Video className="size-4 shrink-0 text-primary" />
                        ) : (
                          <Building2 className="size-4 shrink-0 text-primary" />
                        )}
                        <div className="min-w-0">
                          <p dir="ltr" className="text-sm font-medium tabular-nums text-foreground">
                            {fmtTime(rule.startTime)}–{fmtTime(rule.endTime)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointmentTypeAr(rule.type)}
                            {!rule.active && " · معطّل"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <AvailabilityRuleFormButton existing={rule} />
                        <AvailabilityRuleDeleteButton id={rule.id} label={`${dayOfWeekAr(day)} ${fmtTime(rule.startTime)}–${fmtTime(rule.endTime)}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function AvailabilityRuleFormButton({ existing }: { existing?: AvailabilityRuleRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState(existing?.dayOfWeek ?? 0)
  const [startTime, setStartTime] = useState(fmtTime(existing?.startTime ?? "09:00"))
  const [endTime, setEndTime] = useState(fmtTime(existing?.endTime ?? "17:00"))
  const [slotMinutes, setSlotMinutes] = useState(existing?.slotMinutes ?? 30)
  const [type, setType] = useState<ConsultationType>(
    (existing?.type as ConsultationType) ?? "VIDEO_CONSULTATION",
  )
  const [active, setActive] = useState(existing?.active ?? true)

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await upsertMyAvailabilityRuleAction({
      id: existing?.id,
      dayOfWeek,
      startTime,
      endTime,
      slotMinutes,
      type,
      active,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(existing ? "تم تحديث الوقت." : "تمت إضافة الوقت.")
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={existing ? "ghost" : "default"}
            size={existing ? "icon-sm" : "sm"}
            aria-label={existing ? "تعديل الوقت" : "إضافة وقت"}
          />
        }
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> وقت جديد</>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "تعديل وقت التوفر" : "وقت توفر جديد"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="اليوم">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{dayOfWeekAr(d)}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="من الساعة">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                dir="ltr"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            <Field label="إلى الساعة">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                dir="ltr"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          </div>

          <Field label="مدة كل موعد">
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} دقيقة</option>
              ))}
            </select>
          </Field>

          <Field label="نوع الاستشارة">
            <div className="flex gap-2">
              {CONSULTATION_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  aria-pressed={type === value}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    type === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </Field>

          {existing && (
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">فعّال — متاح للحجز حاليًا</span>
            </label>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" size="sm" disabled={busy} />}>
            <X className="size-4" /> إلغاء
          </DialogClose>
          <Button type="button" size="sm" loading={busy} loadingText="جارٍ الحفظ…" onClick={() => void onSubmit()}>
            <Save className="size-4" /> حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AvailabilityRuleDeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label="حذف" title="حذف">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      }
      title={`حذف وقت التوفر "${label}"؟`}
      description="لن يعود بإمكان المرضى حجز مواعيد جديدة في هذا الوقت. المواعيد المحجوزة بالفعل لن تتأثر."
      confirmLabel="حذف"
      tone="destructive"
      onConfirm={async () => {
        const res = await deleteMyAvailabilityRuleAction({ id })
        if (res.ok) {
          toast.success("تم الحذف.")
          router.refresh()
          return true
        }
        toast.error(res.error)
        return false
      }}
    />
  )
}
