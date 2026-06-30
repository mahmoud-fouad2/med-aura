"use client"

import { useEffect, useState } from "react"
import { FileText, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { acceptQuote, markQuoteViewed } from "@/lib/actions/quote"
import type { CarePlan, CareQuote } from "@/lib/data/care"

const CAT_LABELS: Record<string, string> = {
  DOCTOR_FEE: "أتعاب الطبيب",
  CENTER_FEE: "رسوم المركز",
  OPERATING_ROOM: "غرفة العمليات",
  ANESTHESIA: "التخدير",
  LAB_TESTS: "الفحوصات",
  MEDICATIONS: "الأدوية",
  MEDICAL_GARMENT: "المشد الطبي",
  HOSPITAL_STAY: "الإقامة",
  FOLLOW_UP: "المتابعة",
  TRANSPORT: "النقل",
  HOTEL: "الفندق",
  TRANSLATION: "الترجمة",
  OTHER: "أخرى",
}

export function PatientCarePanel({
  plan,
  quote,
}: {
  plan: CarePlan | null
  quote: CareQuote | null
}) {
  return (
    <div className="space-y-6">
      {plan && plan.status === "PUBLISHED" && <PlanView plan={plan} />}
      {quote && <QuoteView quote={quote} />}
    </div>
  )
}

function PlanView({ plan }: { plan: CarePlan }) {
  const rows: [string, string | null][] = [
    ["التقييم الطبي", plan.medicalAssessment],
    ["نوع التخدير", plan.anesthesiaType],
    ["مدة التعافي", plan.recoveryPeriod],
    ["تعليمات ما قبل الإجراء", plan.preProcedureInstructions],
    ["تعليمات ما بعد الإجراء", plan.postProcedureInstructions],
    ["المخاطر الرئيسية", plan.mainRisks],
  ]
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <FileText className="size-5 text-primary" /> {plan.title}
      </h2>
      <dl className="space-y-2 text-sm">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium text-foreground">{k}</dt>
              <dd className="leading-relaxed text-muted-foreground">{v}</dd>
            </div>
          ))}
      </dl>
      <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        النتائج تختلف من حالة لأخرى، ويظل القرار النهائي خاضعًا للفحص الطبي
        والاختبارات المطلوبة.
      </p>
    </div>
  )
}

function QuoteView({ quote }: { quote: CareQuote }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingNotice, setPendingNotice] = useState(false)

  const canAccept = quote.status === "SENT" || quote.status === "VIEWED"

  useEffect(() => {
    if (quote.status === "SENT") void markQuoteViewed(quote.id)
  }, [quote.id, quote.status])

  async function onAccept() {
    setBusy(true)
    setError(null)
    const res = await acceptQuote(quote.id)
    if (!res.ok) {
      setBusy(false)
      setError(res.error)
      return
    }
    if (res.data!.paymentConfigured && res.data!.checkoutUrl) {
      window.location.href = res.data!.checkoutUrl
      return
    }
    setBusy(false)
    setPendingNotice(true)
  }

  const money = (v: string) => Number(v).toLocaleString("ar-SA", { maximumFractionDigits: 2 })

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground">
          عرض السعر {quote.quoteNumber}
        </h2>
        <Badge variant={quote.status === "ACCEPTED" ? "default" : "secondary"}>
          {quote.status === "ACCEPTED" ? "مقبول" : "بانتظار قبولك"}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border text-right">
              <th className="py-2">البند</th>
              <th className="py-2">الكمية</th>
              <th className="py-2">السعر</th>
              <th className="py-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="py-2">
                  {it.descriptionAr}
                  <span className="block text-xs text-muted-foreground">
                    {CAT_LABELS[it.category] ?? it.category}
                  </span>
                </td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2">{money(it.unitPrice)}</td>
                <td className="py-2">{money(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="space-y-1 text-sm">
        <Row label="المجموع الفرعي" value={`${money(quote.subtotal)} ${quote.currency}`} />
        {Number(quote.discount) > 0 && <Row label="الخصم" value={`- ${money(quote.discount)} ${quote.currency}`} />}
        <Row label="الضريبة" value={`${money(quote.tax)} ${quote.currency}`} />
        <Row label="الإجمالي" value={`${money(quote.total)} ${quote.currency}`} strong />
        <Row label="العربون المطلوب" value={`${money(quote.depositRequired)} ${quote.currency}`} strong />
        <Row label="المتبقي بعد العربون" value={`${money(quote.remainingBalance)} ${quote.currency}`} />
      </dl>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {pendingNotice ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4" />
          تم قبول العرض. سيتم تأكيد العربون تلقائيًا فور إتمام عملية الدفع.
        </div>
      ) : canAccept ? (
        <Button disabled={busy} onClick={onAccept}>
          <CheckCircle2 className="size-4" />
          {busy ? "جارٍ المتابعة…" : "قبول العرض ودفع العربون"}
        </Button>
      ) : quote.status === "ACCEPTED" ? (
        <p className="text-sm text-success">تم قبول العرض. تابع خطوات الدفع والاعتماد.</p>
      ) : null}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-bold text-foreground" : "text-foreground"}>{value}</dd>
    </div>
  )
}
