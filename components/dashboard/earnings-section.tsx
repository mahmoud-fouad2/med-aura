import { Wallet } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/ui/empty-state"
import { invoiceStatusAr } from "@/lib/status-labels"
import { formatMoney } from "@/lib/money"
import type { EarningsSummary } from "@/lib/data/earnings"

/**
 * A provider's own net-earnings view — shared shape for the doctor and
 * center dashboards. platformCommissionAmount/providerNetAmount are read
 * straight off each invoice (lib/data/finance.ts computes the identical
 * figures for the admin finance page); nothing here recomputes money.
 */
export function EarningsSection({ earnings }: { earnings: EarningsSummary }) {
  return (
    <SectionCard
      icon={Wallet}
      title="أرباحي"
      description="صافي مستحقاتك بعد عمولة المنصة — لكل فاتورة."
      tone="success"
    >
      {earnings.recent.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={Wallet}
            title="لا توجد فواتير بعد"
            description="ستظهر هنا فواتيرك بمجرد إصدارها، مع صافي مستحقاتك من كل واحدة."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {earnings.recent.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
                  {inv.invoiceNumber}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{inv.patientName}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="tabular-nums font-medium text-success">
                  {formatMoney(inv.providerNetAmount, inv.currency)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {invoiceStatusAr(inv.status)} · عمولة {formatMoney(inv.platformCommissionAmount, inv.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
