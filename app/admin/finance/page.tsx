import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  FileText,
  Undo2,
  Radio,
  Percent,
  HandCoins,
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
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RefundReviewPanel } from "@/components/finance/refund-review-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricTile } from "@/components/admin/metric-tile"
import { WorkspaceSection } from "@/components/admin/workspace-panel"
import {
  paymentStatusAr,
  paymentPurposeAr,
  invoiceStatusAr,
} from "@/lib/status-labels"
import { formatMoney, hasMoney, headlineTotal } from "@/lib/money"

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
  // Each figure keeps its own currency: one headline number plus the other
  // currencies named beside it, never a single merged total (lib/money.ts).
  const collected = headlineTotal(summary.collected)
  const invoiced = headlineTotal(summary.invoiced)
  const outstanding = headlineTotal(summary.outstanding)
  const refunded = headlineTotal(summary.refunded)
  const platformCommission = headlineTotal(summary.platformCommission)
  const providerNet = headlineTotal(summary.providerNet)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المالية"
        title="لوحة المالية"
        description="متابعة المدفوعات والفواتير والاسترجاعات بواجهة واضحة للفريق المالي."
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile
          icon={TrendingUp}
          label="إجمالي المحصّل"
          value={collected.value}
          hint={collected.others ? `مدفوعات ناجحة — و${collected.others}` : "مدفوعات ناجحة مؤكَّدة"}
          tone="success"
          emphasis
        />
        <MetricTile
          icon={Percent}
          label="عمولة المنصة بالفواتير"
          value={platformCommission.value}
          hint={platformCommission.others ? `حسب العملات — و${platformCommission.others}` : "مثبتة وقت إصدار كل فاتورة"}
          tone="primary"
        />
        <MetricTile
          icon={HandCoins}
          label="صافي مقدمي الخدمة"
          value={providerNet.value}
          hint={providerNet.others ? `حسب العملات — و${providerNet.others}` : "إجمالي الفواتير بعد عمولة المنصة"}
          tone="neutral"
        />
        <MetricTile
          icon={Wallet}
          label="إجمالي الفواتير"
          value={invoiced.value}
          hint={invoiced.others ? `جميع الفواتير — و${invoiced.others}` : "جميع الفواتير المُصدَرة"}
          tone="primary"
          emphasis
        />
        <MetricTile
          icon={AlertCircle}
          label="متبقٍ غير محصّل"
          value={outstanding.value}
          hint={
            outstanding.others
              ? `بحاجة للمتابعة — و${outstanding.others}`
              : hasMoney(summary.outstanding)
                ? "بحاجة للمتابعة"
                : "كل شيء محصَّل"
          }
          tone={hasMoney(summary.outstanding) ? "warning" : "success"}
          emphasis
        />
        <MetricTile
          icon={TrendingDown}
          label="إجمالي المسترجع"
          value={refunded.value}
          hint={refunded.others ? `مبالغ رُدَّت — و${refunded.others}` : "مبالغ رُدَّت للمرضى"}
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
            تحديثات الدفع ({webhooks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <WorkspaceSection
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
                getRowKey={(p) => p.id}
                columns={[
                  { header: "المرجع", cell: (p) => <span dir="ltr" className="font-mono text-xs">{p.reference}</span> },
                  { header: "الغرض", cell: (p) => paymentPurposeAr(p.purpose) },
                  { header: "الدافع", cell: (p) => <span className="font-medium text-foreground">{p.payerName}</span>, mobile: "title" },
                  { header: "الحالة", cell: (p) => <PaymentStatusPill status={p.status} />, mobile: "badge" },
                  { header: "المبلغ", cell: (p) => <span className="tabular-nums font-medium text-foreground">{formatMoney(p.amount, p.currency)}</span> },
                  { header: "التاريخ", cell: (p) => <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}</span> },
                ]}
                actions={(p) =>
                  p.status === "PAID" ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={
                        <a
                          href={`/api/invoices/payment/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="تنزيل الفاتورة"
                          title="تنزيل الفاتورة"
                        >
                          <Download className="size-4" />
                        </a>
                      }
                    />
                  ) : null
                }
              />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <WorkspaceSection
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
                  { header: "المريض", cell: (i) => <span className="font-medium text-foreground">{i.patientName}</span>, mobile: "title" },
                  { header: "الحالة", cell: (i) => <Badge variant="outline">{invoiceStatusAr(i.status)}</Badge>, mobile: "badge" },
                  { header: "الإجمالي", cell: (i) => <span className="tabular-nums font-medium text-foreground">{formatMoney(i.total, i.currency)}</span> },
                  { header: "عمولة المنصة", cell: (i) => <span className="tabular-nums">{formatMoney(i.platformCommissionAmount, i.currency)} ({Number(i.platformCommissionRate)}%)</span> },
                  { header: "صافي المقدم", cell: (i) => <span className="tabular-nums">{formatMoney(i.providerNetAmount, i.currency)}</span> },
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
                        {formatMoney(i.remainingAmount, i.currency)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <WorkspaceSection
            icon={Undo2}
            title="طلبات الاسترجاع"
            description="مراجعة، اعتماد، ورفض طلبات الاسترجاع."
            tone="warning"
          >
            <div className="p-5">
              <RefundReviewPanel refunds={refunds} />
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <WorkspaceSection
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
                  { header: "الدافع", cell: (p) => <span className="font-medium text-foreground">{p.payerName}</span>, mobile: "title" },
                  { header: "المبلغ", cell: (p) => <span className="tabular-nums font-medium text-destructive">{formatMoney(p.amount, p.currency)}</span> },
                ]}
              />
            )}
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WorkspaceSection
            icon={Radio}
            title="تحديثات الدفع"
            description="آخر التحديثات الواردة من بوابة الدفع وحالة التعامل معها."
            tone="neutral"
          >
            {webhooks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Radio}
                  title="لا توجد تحديثات دفع بعد"
                  description="ستظهر هنا التحديثات الجديدة عند وصولها."
                />
              </div>
            ) : (
              <DataTable
                rows={webhooks}
                columns={[
                  { header: "المزود", cell: (w) => <span dir="ltr" className="font-mono text-xs text-muted-foreground">{w.provider}</span> },
                  { header: "النوع", cell: (w) => <span dir="ltr" className="font-mono text-xs">{w.type}</span>, mobile: "title" },
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
                    mobile: "badge",
                  },
                  { header: "التاريخ", cell: (w) => <span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString("ar-SA-u-nu-latn")}</span> },
                ]}
              />
            )}
          </WorkspaceSection>
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
