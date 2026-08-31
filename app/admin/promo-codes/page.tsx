import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listPromoCodesAction } from "@/lib/actions/promo"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card } from "@/components/ui/card"
import { PromoCodesTable } from "@/components/admin/promo-codes-table"

export const dynamic = "force-dynamic"
export const metadata = { title: "أكواد الخصم" }

export default async function PromoCodesPage() {
  await requirePermissionPage(PERMISSIONS.PROMO_MANAGE)
  const result = await listPromoCodesAction()
  const codes = result.status === "ok" ? result.codes : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النمو والتسويق"
        title="أكواد الخصم"
        description="كل قيمة هنا — النسبة أو المبلغ، الحدود، التواريخ — تُدار من هذه الصفحة، وليست ثابتة في الكود."
        stats={
          codes.length > 0
            ? [
                { label: "الإجمالي", value: codes.length.toLocaleString("ar-SA-u-nu-latn") },
                {
                  label: "نشطة",
                  value: codes.filter((c) => c.active).length.toLocaleString("ar-SA-u-nu-latn"),
                },
              ]
            : undefined
        }
      />

      <Card className="overflow-hidden p-0">
        <PromoCodesTable initialCodes={codes} />
      </Card>
    </div>
  )
}
