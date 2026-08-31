import { redirect } from "next/navigation"
import { requireAuthPage } from "@/lib/session"
import { getMyReferralAction } from "@/lib/actions/referral"
import { ReferralSection } from "@/components/dashboard/referral-section"

export const dynamic = "force-dynamic"
export const metadata = { title: "دعوة صديقة" }

export default async function ReferralPage() {
  await requireAuthPage("/dashboard/referral")
  const result = await getMyReferralAction()
  if (result.status === "error") redirect("/dashboard")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">دعوة صديقة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          شاركي كودك مع صديقة، وعند أول استشارة مدفوعة تحجزها بكودك، تحصلان معًا على مكافأة.
        </p>
      </div>
      <ReferralSection data={result.data} />
    </div>
  )
}
