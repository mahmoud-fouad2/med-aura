import { requireAuthPage } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { getTwoFactorStatus } from "@/lib/data/security"
import { PageHeader } from "@/components/dashboard/page-header"
import { SecuritySettings } from "@/components/dashboard/security-settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "الأمان" }

export default async function SecurityPage() {
  const user = await requireAuthPage("/dashboard/security")
  const [status, { locale }] = await Promise.all([getTwoFactorStatus(user.id), getI18n()])
  const isAr = locale === "ar"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isAr ? "حسابك" : "Your account"}
        title={isAr ? "الأمان" : "Security"}
        description={
          isAr
            ? "أضيفي طبقة حماية إضافية لحسابك بتفعيل التحقق بخطوتين."
            : "Add an extra layer of protection to your account with two-factor verification."
        }
      />
      <SecuritySettings initialStatus={status} locale={locale} />
    </div>
  )
}
