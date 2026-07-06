import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  FileText,
  Undo2,
  Radio,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import {
  listPayments,
  listInvoicesFinance,
  listRefundRequestsFinance,
  listWebhookEvents,
  getFinanceSummary,
} from "@/lib/data/finance"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RefundReviewPanel } from "@/components/finance/refund-review-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import {
  paymentStatusAr,
  paymentPurposeAr,
  currencyAr,
  invoiceStatusAr,
} from "@/lib/status-labels"

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
  const cur = currencyAr(summary.currency)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="لوحة المالية"
        description="المدفوعات، الفواتير، الاسترجاعات، والنزاعات — بيانات لحظية من قاعدة البيانات."
        actions={
          <Button
            variant="outline"
            size="sm"
            render={
              <a href="/api/finance/export">
                <Download className="size-4" />
                تصدير المدفوعات (CSV)
              </a>
            }
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          label="إجمالي المحصّل"
          value={`${summary.totalCollected.toLocaleString("ar-SA-u-nu-latn")} ${cur}`}
          hint="مدفوعات ناجحة مؤكَّدة"
          tone="success"
          emphasis
        />
        <MetricCard
          icon={Wallet}
          label="إجمالي الفواتير"
          value={`${summary.totalInvoiced.toLocaleString("ar-SA-u-nu-latn")} ${cur}`}
          hint="جميع الفواتير المُصدَرة"
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={AlertCircle}
          label="متبقٍ غير محصّل"
          value={`${summary.totalOutstanding.toLocaleString("ar-SA-u-nu-latn")} ${cur}`}
          hint={
            summary.totalOutstanding > 0
              ? "بحاجة للمتابعة"
              : "كل شيء محصَّل"
          }
          tone={summary.totalOutstanding > 0 ? "warning" : "success"}
          emphasis
        />
        <MetricCard
          icon={TrendingDown}
          label="إجمالي المسترجع"
          value={`${summary.totalRefunded.toLocaleString("ar-SA-u-nu-latn")} ${cur}`}
          hint="مبالغ رُدَّت للمرضى"
          tone="neutral"
          emphasis
        />
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="payments">
            المدفوعات ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            الفواتير ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="refunds">
            الاسترجاعات ({refunds.length})
          </TabsTrigger>
          <TabsTrigger value="disputes">
            النزاعات ({disputedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            سجل الأحداث ({webhooks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <SectionCard
            icon={Wallet}
            title="سجل المدفوعات"
            description="كل محاولات الدفع مع مرجعها وحالتها."
            tone="success"
          >
            {payments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Wallet}
                  title="لا توجد مدفوعات بعد"
                  description="ستظهر هنا كل محاولات الدفع بمجرد استقبالها."
                />
              </div>
            ) : (
              <DataTable
                rows={payments}
                columns={[
                  { header: "المرجع", cell: (p) => <span dir="ltr" className="font-mono text-xs">{p.reference}</span> },
                  { header: "الغرض", cell: (p) => paymentPurposeAr(p.purpose) },
                  { header: "الدافع", cell: (p) => <span className="font-medium text-foreground">{p.payerName}</span> },
                  { header: "الحالة", cell: (p) => <PaymentStatusPill status={p.status} /> },
                  { header: "المبلغ", cell: (p) => <span className="tabular-nums font-medium text-foreground">{Number(p.amount).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(p.currency)}</span> },
                  { header: "التاريخ", cell: (p) => <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SectionCard
            icon={FileText}
            title="الفواتير"
            description="فواتير الحالات مع المتبقي والإجمالي."
          >
            {invoices.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={FileText}
                  title="لا توجد فواتير بعد"
                  description="ستظهر هنا فواتير الحالات بمجرد إصدارها."
                />
              </div>
            ) : (
              <DataTable
                rows={invoices}
                columns={[
                  { header: "الرقم", cell: (i) => <span dir="ltr" className="font-mono text-xs">{i.invoiceNumber}</span> },
                  { header: "المريض", cell: (i) => <span className="font-medium text-foreground">{i.patientName}</span> },
                  { header: "الحالة", cell: (i) => <Badge variant="outline">{invoiceStatusAr(i.status)}</Badge> },
                  { header: "الإجمالي", cell: (i) => <span className="tabular-nums font-medium text-foreground">{Number(i.total).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(i.currency)}</span> },
                  {
                    header: "المتبقي",
                    cell: (i) => (
                      <span
                        className={
                          "tabular-nums font-medium " +
                          (Number(i.remainingAmount) > 0
                            ? "text-warning-foreground"
                            : "text-success")
                        }
                      >
                        {Number(i.remainingAmount).toLocaleString("ar-SA-u-nu-latn")}{" "}
                        {currencyAr(i.currency)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <SectionCard
            icon={Undo2}
            title="طلبات الاسترجاع"
            description="مراجعة، اعتماد، ورفض طلبات الاسترجاع."
            tone="warning"
          >
            <div className="p-5">
              <RefundReviewPanel refunds={refunds} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <SectionCard
            icon={AlertCircle}
            title="مدفوعات متنازع عليها"
            description="نزاعات مفتوحة تحتاج ردًا سريعًا للمزوّد."
            tone="danger"
          >
            {disputedPayments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={AlertCircle}
                  title="لا توجد نزاعات"
                  description="لا توجد مدفوعات متنازع عليها حاليًا."
                />
              </div>
            ) : (
              <DataTable
                rows={disputedPayments}
                columns={[
                  { header: "المرجع", cell: (p) => <span dir="ltr" className="font-mono text-xs">{p.reference}</span> },
                  { header: "الدافع", cell: (p) => <span className="font-medium text-foreground">{p.payerName}</span> },
                  { header: "المبلغ", cell: (p) => <span className="tabular-nums font-medium text-destructive">{Number(p.amount).toLocaleString("ar-SA-u-nu-latn")} {currencyAr(p.currency)}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <SectionCard
            icon={Radio}
            title="سجل أحداث الدفع"
            description="أحداث Webhook من بوابة الدفع مع نتيجة كل معالجة."
            tone="neutral"
          >
            {webhooks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Radio}
                  title="لا يوجد سجل أحداث بعد"
                  description="ستظهر هنا أحداث بوابة الدفع بمجرد وصولها."
                />
              </div>
            ) : (
              <DataTable
                rows={webhooks}
                columns={[
                  { header: "المزود", cell: (w) => <span dir="ltr" className="font-mono text-xs text-muted-foreground">{w.provider}</span> },
                  { header: "النوع", cell: (w) => <span dir="ltr" className="font-mono text-xs">{w.type}</span> },
                  {
                    header: "الحالة",
                    cell: (w) =>
                      w.error ? (
                        <Badge variant="destructive">فشل</Badge>
                      ) : w.processedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          تمت المعالجة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                          قيد الانتظار
                        </span>
                      ),
                  },
                  { header: "التاريخ", cell: (w) => <span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString("ar-SA-u-nu-latn")}</span> },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PaymentStatusPill({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-success/10 text-success"
      : status === "FAILED" || status === "DISPUTED"
        ? "bg-destructive/10 text-destructive"
        : status === "REFUNDED" || status === "PARTIALLY_REFUNDED"
          ? "bg-muted text-muted-foreground"
          : "bg-warning/15 text-warning-foreground"
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
        tone
      }
    >
      {paymentStatusAr(status)}
    </span>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/25 text-xs text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.header}
                className="px-4 py-2.5 text-start font-medium"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/25">
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-3">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
