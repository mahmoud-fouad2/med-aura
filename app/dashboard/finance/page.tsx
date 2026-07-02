import { Download, TrendingUp, TrendingDown, AlertCircle, Wallet } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listPayments,
  listInvoicesFinance,
  listRefundRequestsFinance,
  listWebhookEvents,
  getFinanceSummary,
} from "@/lib/data/finance"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RefundReviewPanel } from "@/components/finance/refund-review-panel"
import { paymentStatusAr, paymentPurposeAr, currencyAr, invoiceStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function FinanceDashboardPage() {
  await requirePermissionPage(PERMISSIONS.FINANCE_ACCESS)

  const [summary, payments, invoices, refunds, webhooks] = await Promise.all([
    getFinanceSummary(),
    listPayments(),
    listInvoicesFinance(),
    listRefundRequestsFinance(),
    listWebhookEvents(),
  ])
  const disputedPayments = payments.filter((p) => p.status === "DISPUTED")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">لوحة المالية</h1>
        <a
          href="/api/finance/export"
          className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="size-4" /> تصدير المدفوعات (CSV)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="إجمالي المحصّل" value={summary.totalCollected} currency={summary.currency} />
        <SummaryCard icon={Wallet} label="إجمالي الفواتير" value={summary.totalInvoiced} currency={summary.currency} />
        <SummaryCard icon={AlertCircle} label="متبقٍ غير محصّل" value={summary.totalOutstanding} currency={summary.currency} warn />
        <SummaryCard icon={TrendingDown} label="إجمالي المسترجع" value={summary.totalRefunded} currency={summary.currency} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="payments">المدفوعات ({payments.length})</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير ({invoices.length})</TabsTrigger>
          <TabsTrigger value="refunds">الاسترجاعات ({refunds.length})</TabsTrigger>
          <TabsTrigger value="disputes">النزاعات ({disputedPayments.length})</TabsTrigger>
          <TabsTrigger value="webhooks">سجل أحداث الدفع ({webhooks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد مدفوعات بعد" description="ستظهر هنا كل محاولات الدفع." />
          ) : (
            <DataTable
              rows={payments}
              columns={[
                { header: "المرجع", cell: (p) => p.reference },
                { header: "الغرض", cell: (p) => paymentPurposeAr(p.purpose) },
                { header: "الدافع", cell: (p) => p.payerName },
                { header: "الحالة", cell: (p) => <Badge variant="outline">{paymentStatusAr(p.status)}</Badge> },
                { header: "المبلغ", cell: (p) => `${Number(p.amount).toLocaleString("ar-SA")} ${currencyAr(p.currency)}` },
                { header: "التاريخ", cell: (p) => new Date(p.createdAt).toLocaleDateString("ar-SA") },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد فواتير بعد" description="ستظهر هنا فواتير الحالات." />
          ) : (
            <DataTable
              rows={invoices}
              columns={[
                { header: "الرقم", cell: (i) => i.invoiceNumber },
                { header: "المريض", cell: (i) => i.patientName },
                { header: "الحالة", cell: (i) => <Badge variant="outline">{invoiceStatusAr(i.status)}</Badge> },
                { header: "الإجمالي", cell: (i) => `${Number(i.total).toLocaleString("ar-SA")} ${currencyAr(i.currency)}` },
                { header: "المتبقي", cell: (i) => `${Number(i.remainingAmount).toLocaleString("ar-SA")} ${currencyAr(i.currency)}` },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <RefundReviewPanel refunds={refunds} />
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          {disputedPayments.length === 0 ? (
            <EmptyState icon={AlertCircle} title="لا توجد نزاعات" description="لا توجد مدفوعات متنازع عليها حاليًا." />
          ) : (
            <DataTable
              rows={disputedPayments}
              columns={[
                { header: "المرجع", cell: (p) => p.reference },
                { header: "الدافع", cell: (p) => p.payerName },
                { header: "المبلغ", cell: (p) => `${Number(p.amount).toLocaleString("ar-SA")} ${currencyAr(p.currency)}` },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          {webhooks.length === 0 ? (
            <EmptyState icon={Wallet} title="لا يوجد سجل أحداث بعد" description="ستظهر هنا أحداث بوابة الدفع." />
          ) : (
            <DataTable
              rows={webhooks}
              columns={[
                { header: "المزود", cell: (w) => w.provider },
                { header: "النوع", cell: (w) => w.type },
                { header: "الحالة", cell: (w) => (w.error ? <Badge variant="destructive">فشل</Badge> : w.processedAt ? <Badge variant="outline">تمت المعالجة</Badge> : <Badge variant="secondary">قيد الانتظار</Badge>) },
                { header: "التاريخ", cell: (w) => new Date(w.createdAt).toLocaleString("ar-SA") },
              ]}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  currency,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  currency: string
  warn?: boolean
}) {
  return (
    <Card className="space-y-1 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-4 ${warn ? "text-warning" : ""}`} />
        <span className="text-sm">{label}</span>
      </div>
      <p className={`font-heading text-xl font-bold ${warn ? "text-warning" : "text-foreground"}`}>
        {value.toLocaleString("ar-SA")} {currencyAr(currency)}
      </p>
    </Card>
  )
}

function DataTable<T>({
  rows,
  columns,
}: {
  rows: T[]
  columns: { header: string; cell: (row: T) => React.ReactNode }[]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-right">
            {columns.map((c) => (
              <th key={c.header} className="p-3">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border hover:bg-muted/30">
              {columns.map((c) => (
                <td key={c.header} className="p-3">{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
