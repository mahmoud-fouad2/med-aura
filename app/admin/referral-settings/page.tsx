import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { getReferralSettingsAction } from "@/lib/actions/referral"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card } from "@/components/ui/card"
import { ReferralSettingsForm } from "@/components/admin/referral-settings-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "برنامج الدعوات" }

export default async function ReferralSettingsPage() {
  await requirePermissionPage(PERMISSIONS.REFERRAL_MANAGE)
  const result = await getReferralSettingsAction()
  const settings =
    result.status === "ok"
      ? result.settings
      : {
          id: null,
          active: false,
          referrerRewardType: "FIXED" as const,
          referrerRewardValue: "50.00",
          refereeRewardType: "FIXED" as const,
          refereeRewardValue: "50.00",
          currency: "SAR",
          rewardValidDays: 90,
        }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="النمو والتسويق"
        title="برنامج الدعوات"
        description="مكافأة الداعي والمدعو — النوع والقيمة ومدة الصلاحية — كلها تُدار من هذه الصفحة، وليست ثابتة في الكود. المكافأة تُصرف تلقائيًا ككود خصم عند أول استشارة مدفوعة للمدعو."
      />

      <Card className="max-w-2xl p-6">
        <ReferralSettingsForm initial={settings} />
      </Card>
    </div>
  )
}
