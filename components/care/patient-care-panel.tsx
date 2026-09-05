"use client"

import { useEffect, useState } from "react"
import { FileText, CheckCircle2, Info, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
import { acceptQuote, markQuoteViewed } from "@/lib/actions/quote"
import { createDepositPayment } from "@/lib/actions/payment"
import { currencyAr } from "@/lib/status-labels"
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
  caseId,
  caseStatus,
  readOnly = false,
}: {
  plan: CarePlan | null
  quote: CareQuote | null
  caseId?: string
  caseStatus?: string
  /** Staff/admin viewing on behalf of oversight, not the patient — no accept/pay actions. */
  readOnly?: boolean
}) {
  return (
    <div className="space-y-6">
      {plan && plan.status === "PUBLISHED" && <PlanView plan={plan} />}
      {quote && (
        <QuoteView
          quote={quote}
          caseId={caseId}
          caseStatus={caseStatus}
          readOnly={readOnly}
        />
      )}
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

function QuoteView({
  quote,
  caseId,
  caseStatus,
  readOnly,
}: {
  quote: CareQuote
  caseId?: string
  caseStatus?: string
  readOnly: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingNotice, setPendingNotice] = useState(false)

  const canAccept = !readOnly && (quote.status === "SENT" || quote.status === "VIEWED")
  const canPayDeposit =
    !readOnly &&
    quote.status === "ACCEPTED" &&
    caseStatus === "QUOTE_ACCEPTED" &&
    Boolean(caseId)

  useEffect(() => {
    if (!readOnly && quote.status === "SENT") void markQuoteViewed(quote.id)
  }, [quote.id, quote.status, readOnly])

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

  async function onPayDeposit() {
    if (!caseId) return
    setBusy(true)
    setError(null)
    const res = await createDepositPayment(caseId)
    if (!res.ok) {
      setBusy(false)
      setError(res.error)
      return
    }
    if (res.data?.paymentConfigured && res.data?.checkoutUrl) {
      window.location.href = res.data.checkoutUrl
      return
    }
    setBusy(false)
    setPendingNotice(true)
  }

  const money = (v: string) => Number(v).toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 2 })

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

      <div className="space-y-2 sm:hidden">
        {quote.items.map((it, i) => (
          <MobileDataCard
            key={i}
            title={it.descriptionAr}
            subtitle={CAT_LABELS[it.category] ?? it.category}
            rows={[
              { label: "الكمية", value: it.quantity },
              { label: "السعر", value: money(it.unitPrice) },
              { label: "الإجمالي", value: money(it.total) },
            ]}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
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
        <Row label="المجموع الفرعي" value={`${money(quote.subtotal)} ${currencyAr(quote.currency)}`} />
        {Number(quote.discount) > 0 && <Row label="الخصم" value={`- ${money(quote.discount)} ${currencyAr(quote.currency)}`} />}
        <Row label="الضريبة" value={`${money(quote.tax)} ${currencyAr(quote.currency)}`} />
        <Row label="الإجمالي" value={`${money(quote.total)} ${currencyAr(quote.currency)}`} strong />
        <Row label="العربون المطلوب" value={`${money(quote.depositRequired)} ${currencyAr(quote.currency)}`} strong />
        <Row label="المتبقي بعد العربون" value={`${money(quote.remainingBalance)} ${currencyAr(quote.currency)}`} />
      </dl>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {pendingNotice ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4" />
          تم تسجيل طلب الدفع. سيتم تأكيد العربون وتحديث حالة الحالة فور إتمام العملية.
        </div>
      ) : canAccept ? (
        <Button disabled={busy} onClick={onAccept}>
          <CheckCircle2 className="size-4" />
          {busy ? "جارٍ المتابعة…" : "قبول العرض ودفع العربون"}
        </Button>
      ) : canPayDeposit ? (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">العربون المطلوب:</span>
            <span className="font-bold text-foreground">
              {money(quote.depositRequired)} {currencyAr(quote.currency)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            تم قبول عرض السعر. يرجى سداد العربون لتأكيد حجز الإجراء والبدء في الإجراءات الطبية.
          </p>
          <Button disabled={busy} onClick={onPayDeposit}>
            <CreditCard className="size-4" />
            {busy ? "جارٍ التوجيه للدفع…" : "دفع العربون الآن"}
          </Button>
        </div>
      ) : quote.status === "ACCEPTED" ? (
        <p className="text-sm text-success">تم قبول العرض ودفع العربون بنجاح.</p>
      ) : readOnly && (quote.status === "SENT" || quote.status === "VIEWED") ? (
        <p className="text-sm text-muted-foreground">بانتظار قبول المريض للعرض.</p>
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
