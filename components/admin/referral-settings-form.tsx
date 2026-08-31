"use client"

import { useState } from "react"
import { Loader2, Save, Check } from "lucide-react"
import { updateReferralSettingsAction, type ReferralSettingsRow } from "@/lib/actions/referral"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function ReferralSettingsForm({ initial }: { initial: ReferralSettingsRow }) {
  const [active, setActive] = useState(initial.active)
  const [referrerRewardType, setReferrerRewardType] = useState(initial.referrerRewardType)
  const [referrerRewardValue, setReferrerRewardValue] = useState(initial.referrerRewardValue)
  const [refereeRewardType, setRefereeRewardType] = useState(initial.refereeRewardType)
  const [refereeRewardValue, setRefereeRewardValue] = useState(initial.refereeRewardValue)
  const [currency, setCurrency] = useState(initial.currency)
  const [rewardValidDays, setRewardValidDays] = useState(String(initial.rewardValidDays))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    setError(null)
    setSaved(false)
    const result = await updateReferralSettingsAction({
      active,
      referrerRewardType,
      referrerRewardValue,
      refereeRewardType,
      refereeRewardValue,
      currency,
      rewardValidDays,
    })
    setBusy(false)
    if (result.status === "error") {
      setError(result.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <Checkbox checked={active} onCheckedChange={(c) => setActive(Boolean(c))} className="mt-0.5" />
        <span>
          <span className="block font-medium text-foreground">تفعيل برنامج الدعوات</span>
          <span className="block text-xs text-muted-foreground">
            عند الإيقاف، لا تُنشأ أي دعوات جديدة ولا تُصرف أي مكافآت — الأكواد التي صُرفت سابقًا تبقى كما هي.
          </span>
        </span>
      </label>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <Field label="عملة المكافآت">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
        </Field>
        <Field label="مدة صلاحية كود المكافأة (بالأيام)">
          <Input
            type="number"
            min={1}
            value={rewardValidDays}
            onChange={(e) => setRewardValidDays(e.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">مكافأة الداعي (بعد أول استشارة مدفوعة للمدعو)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع المكافأة">
            <select
              className={selectClass}
              value={referrerRewardType}
              onChange={(e) => setReferrerRewardType(e.target.value as "PERCENTAGE" | "FIXED")}
            >
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PERCENTAGE">نسبة مئوية</option>
            </select>
          </Field>
          <Field label={referrerRewardType === "PERCENTAGE" ? "النسبة %" : `القيمة (${currency})`}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={referrerRewardValue}
              onChange={(e) => setReferrerRewardValue(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">مكافأة المدعو (نفس اللحظة، عند أول استشارة مدفوعة)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع المكافأة">
            <select
              className={selectClass}
              value={refereeRewardType}
              onChange={(e) => setRefereeRewardType(e.target.value as "PERCENTAGE" | "FIXED")}
            >
              <option value="FIXED">مبلغ ثابت</option>
              <option value="PERCENTAGE">نسبة مئوية</option>
            </select>
          </Field>
          <Field label={refereeRewardType === "PERCENTAGE" ? "النسبة %" : `القيمة (${currency})`}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={refereeRewardValue}
              onChange={(e) => setRefereeRewardValue(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button onClick={() => void handleSave()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ الإعدادات
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <Check className="size-4" /> تم الحفظ
          </span>
        )}
      </div>
    </div>
  )
}
