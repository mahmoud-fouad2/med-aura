"use client"

import { useState } from "react"
import Link from "next/link"
import { Download, CreditCard, Video } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { ManualPaymentDialog } from "@/components/admin/manual-payment-dialog"
import {
  appointmentStatusAr,
  appointmentTypeAr,
  currencyAr,
  paymentStatusAr,
} from "@/lib/status-labels"

export type ConsultationRow = {
  id: string
  reference: string
  type: string
  status: string
  startsAt: Date
  endsAt: Date
  priceAmount: string | null
  currency: string
  counterpartName: string
  patientName: string
  paymentStatus: string | null
  paymentId: string | null
  caseId: string | null
}

function statusTone(s: string): StatusTone {
  if (s === "CONFIRMED" || s === "COMPLETED" || s === "CHECKED_IN" || s === "IN_PROGRESS") return "success"
  if (s === "PENDING_PAYMENT" || s === "PENDING_PROVIDER_CONFIRMATION" || s === "RESCHEDULED") return "warning"
  if (s === "CANCELLED_BY_PATIENT" || s === "CANCELLED_BY_PROVIDER" || s === "NO_SHOW") return "danger"
  return "neutral"
}

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  )
}

/**
 * Consultations admin table + row-details drawer. `canRecordManualPayment`
 * is decided server-side (FINANCE_ACCESS) and passed down — the client
 * never guesses its own permissions, it only renders what the server
 * already decided is visible; recordManualPayment() re-checks anyway.
 */
export function ConsultationTable({
  rows,
  canRecordManualPayment,
}: {
  rows: ConsultationRow[]
  canRecordManualPayment: boolean
}) {
  const [selected, setSelected] = useState<ConsultationRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        onRowClick={setSelected}
        columns={[
          { header: "المرجع", cell: (r) => <span dir="ltr" className="font-mono text-xs">{r.reference}</span> },
          { header: "النوع", cell: (r) => appointmentTypeAr(r.type) },
          { header: "الحالة", cell: (r) => <StatusBadge tone={statusTone(r.status)} label={appointmentStatusAr(r.status)} />, mobile: "badge" },
          { header: "المريض", cell: (r) => r.patientName, mobile: "title" },
          { header: "الطبيب", cell: (r) => r.counterpartName },
          { header: "الموعد", cell: (r) => <span className="text-xs text-muted-foreground">{fmtDateTime(r.startsAt)}</span> },
          {
            header: "السعر",
            cell: (r) => (r.priceAmount ? `${r.priceAmount} ${currencyAr(r.currency)}` : "—"),
          },
          {
            header: "الدفع",
            cell: (r) => (r.paymentStatus ? paymentStatusAr(r.paymentStatus) : "—"),
          },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="left">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle dir="ltr" className="font-mono text-sm">
                  {selected.reference}
                </SheetTitle>
                <SheetDescription>
                  <StatusBadge tone={statusTone(selected.status)} label={appointmentStatusAr(selected.status)} />
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
                <DetailGroup>
                  <DetailRow label="المريض" value={selected.patientName} />
                  <DetailRow label="الطبيب" value={selected.counterpartName} />
                  <DetailRow label="نوع الاستشارة" value={appointmentTypeAr(selected.type)} />
                  <DetailRow label="الموعد" value={fmtDateTime(selected.startsAt)} />
                </DetailGroup>

                <DetailGroup title="الدفع">
                  <DetailRow
                    label="السعر"
                    value={selected.priceAmount ? `${selected.priceAmount} ${currencyAr(selected.currency)}` : "—"}
                  />
                  <DetailRow
                    label="حالة الدفع"
                    value={selected.paymentStatus ? paymentStatusAr(selected.paymentStatus) : "لا توجد دفعة بعد"}
                  />
                </DetailGroup>

                {selected.type === "VIDEO_CONSULTATION" ? (
                  <DetailGroup title="الاستشارة المرئية">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Video className="size-4" />
                      حالة غرفة الفيديو التفصيلية غير متاحة من هذه القائمة بعد — راجع سجل الحالة.
                    </p>
                  </DetailGroup>
                ) : null}

                {selected.caseId ? (
                  <Link
                    href={`/admin/cases?q=${encodeURIComponent(selected.reference)}`}
                    className="block text-sm font-medium text-primary hover:underline"
                  >
                    فتح الحالة المرتبطة ←
                  </Link>
                ) : null}
              </div>

              <SheetFooter>
                {selected.paymentStatus === "PAID" && selected.paymentId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        href={`/api/invoices/payment/${selected.paymentId}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" /> تنزيل الفاتورة
                      </Link>
                    }
                  />
                ) : null}
                {canRecordManualPayment && selected.status === "PENDING_PAYMENT" ? (
                  <ManualPaymentDialog
                    appointmentId={selected.id}
                    appointmentReference={selected.reference}
                    defaultAmount={selected.priceAmount}
                    defaultCurrency={selected.currency}
                    trigger={
                      <Button size="sm" className="w-full">
                        <CreditCard className="size-4" /> تسجيل دفعة يدوية
                      </Button>
                    }
                  />
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function DetailGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
      <div className="space-y-1.5 rounded-lg border border-border/60 p-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
