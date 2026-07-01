"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, AlertOctagon, CheckCircle2, PhoneCall, Siren, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  reportSymptoms,
  acknowledgeSafetyAlert,
  markPatientContacted,
  markProviderReviewed,
  resolveSafetyAlert,
} from "@/lib/actions/safety"
import { WARNING_SIGNS } from "@/lib/care/warning-signs"
import type { SafetyAlertView } from "@/lib/data/care"

const SEVERITY_VARIANT: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "destructive",
  CRITICAL: "destructive",
}
const SEVERITY_LABEL: Record<string, string> = {
  LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية", CRITICAL: "حرجة",
}
const STATUS_LABEL: Record<string, string> = {
  OPEN: "مفتوح",
  ACKNOWLEDGED: "تم الإقرار",
  CONTACTED: "تم التواصل مع المريض",
  PROVIDER_REVIEWED: "راجعه مقدّم الخدمة",
  RESOLVED: "تم الحل",
  REFERRED_TO_EMERGENCY: "أُحيل للطوارئ",
  FALSE_ALARM: "إنذار كاذب",
}

/** Patient-facing: report symptoms. Never suggests a diagnosis — only routes to the care team. */
export function ReportSymptomsForm({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<boolean | null>(null)

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))
  }

  async function onSubmit() {
    setBusy(true)
    setError(null)
    const res = await reportSymptoms({ caseId, warningSigns: selected, description })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setDone(res.data!.alertCreated)
    router.refresh()
  }

  if (done !== null) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm">
        {done ? (
          <p className="flex items-start gap-2 text-destructive">
            <Siren className="mt-0.5 size-4 shrink-0" />
            تم إرسال بلاغك فورًا لفريق الرعاية. إن كانت حالتك طارئة، توجّه لأقرب
            طوارئ الآن ولا تنتظر الرد.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            تم تسجيل بلاغك وسيراجعه فريق الرعاية.
          </p>
        )}
      </div>
    )
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ShieldAlert className="size-4" /> الإبلاغ عن أعراض
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
        <ShieldAlert className="size-4 text-primary" /> الإبلاغ عن أعراض
      </h3>
      <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        هذا النموذج ليس تشخيصًا طبيًا. اختيار أي علامة أدناه يُنبّه فريق
        الرعاية فورًا للمراجعة. في حال الطوارئ اتصل بالإسعاف مباشرة.
      </p>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">هل تعاني من أي من التالي؟</legend>
        {WARNING_SIGNS.map((w) => (
          <label key={w.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(w.key)} onChange={() => toggle(w.key)} />
            {w.labelAr}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="symptom-desc">
          تفاصيل إضافية (اختياري)
        </label>
        <Textarea id="symptom-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={busy} onClick={onSubmit}>
          {busy ? "جارٍ الإرسال…" : "إرسال البلاغ"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </div>
  )
}

/** Care-team facing: acknowledge → contact → review → resolve. */
export function SafetyAlertList({ alerts }: { alerts: SafetyAlertView[] }) {
  const openAlerts = alerts.filter((a) =>
    ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "REFERRED_TO_EMERGENCY"].includes(a.status),
  )
  const closedAlerts = alerts.filter((a) => !openAlerts.includes(a))
  if (alerts.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <AlertOctagon className="size-5 text-destructive" /> تنبيهات السلامة
      </h2>
      <div className="space-y-3">
        {[...openAlerts, ...closedAlerts].map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: SafetyAlertView }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true)
    setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "حدث خطأ")
    router.refresh()
  }

  return (
    <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "outline"}>
          {SEVERITY_LABEL[alert.severity] ?? alert.severity}
        </Badge>
        <Badge variant="outline">{STATUS_LABEL[alert.status] ?? alert.status}</Badge>
      </div>
      {alert.summary && <p className="text-sm text-foreground">{alert.summary}</p>}
      <p className="text-xs text-muted-foreground">
        {new Date(alert.createdAt).toLocaleString("ar-SA")}
      </p>
      {alert.resolutionNotes && (
        <p className="rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">{alert.resolutionNotes}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {alert.status === "OPEN" && (
        <Button size="sm" disabled={busy} onClick={() => run(() => acknowledgeSafetyAlert(alert.id))}>
          <CheckCircle2 className="size-4" /> إقرار بالاطّلاع
        </Button>
      )}
      {alert.status === "ACKNOWLEDGED" && (
        <Button size="sm" disabled={busy} onClick={() => run(() => markPatientContacted(alert.id, notes))}>
          <PhoneCall className="size-4" /> تم التواصل مع المريض
        </Button>
      )}
      {alert.status === "CONTACTED" && (
        <Button size="sm" disabled={busy} onClick={() => run(() => markProviderReviewed(alert.id, notes))}>
          <CheckCircle2 className="size-4" /> تمت المراجعة الطبية
        </Button>
      )}
      {["ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "OPEN"].includes(alert.status) && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <Textarea
            rows={2}
            placeholder="ملاحظات الإغلاق (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {alert.status !== "OPEN" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => resolveSafetyAlert({ alertId: alert.id, outcome: "RESOLVED", notes }))}
                >
                  إغلاق: تم الحل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => resolveSafetyAlert({ alertId: alert.id, outcome: "FALSE_ALARM", notes }))}
                >
                  إغلاق: إنذار كاذب
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => run(() => resolveSafetyAlert({ alertId: alert.id, outcome: "REFERRED_TO_EMERGENCY", notes }))}
            >
              <Siren className="size-4" /> إحالة للطوارئ
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
