import Link from "next/link"
import { ChevronLeft, Info } from "lucide-react"
import { requireAuthPage } from "@/lib/session"
import { Card } from "@/components/ui/card"
import { channelAvailability } from "@/lib/notifications/channels"
import { getPreferencesForCurrentUser } from "@/lib/actions/notification-preferences"
import { PreferencesForm } from "@/components/notifications/preferences-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "تفضيلات الإشعارات" }

export default async function PreferencesPage() {
  await requireAuthPage("/dashboard/notifications/preferences")
  const [initial, availability] = await Promise.all([
    getPreferencesForCurrentUser(),
    Promise.resolve(channelAvailability()),
  ])

  return (
    <div className="space-y-6">
      <nav
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-label="مسار التنقل"
      >
        <Link href="/dashboard" className="hover:text-foreground">
          لوحة التحكم
        </Link>
        <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
        <Link href="/dashboard/notifications" className="hover:text-foreground">
          الإشعارات
        </Link>
        <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
        <span className="font-medium text-foreground">التفضيلات</span>
      </nav>

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          تفضيلات الإشعارات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          اختر القنوات التي تريد استقبال الإشعارات عبرها. القنوات غير المهيّأة
          على المنصة تظهر معطَّلة لمنع حفظ إعدادات لن تُنفَّذ فعليًا.
        </p>
      </div>

      <Card className="flex items-start gap-2 border-info/30 bg-info/5 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-muted-foreground">
          التنبيهات الحرجة (تنبيهات السلامة، فشل الدفع، انتهاء ترخيص) قد تُرسل
          دائمًا عبر البريد لضمان استلامها، بغضّ النظر عن هذه التفضيلات.
        </p>
      </Card>

      <PreferencesForm initial={initial} availability={availability} />
    </div>
  )
}
