import Link from "next/link"
import { redirect } from "next/navigation"
import { asc, eq } from "drizzle-orm"
import { Building2, ShieldCheck, ChevronLeft } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { country as countryT } from "@/lib/db/schema"
import { CenterApplicationForm } from "@/components/provider/center-application-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "سجّل مركزك",
  description:
    "قدّم طلب انضمام مركزك التجميلي إلى Med Aura ليتم اعتماده ونشره بعد مراجعة فريق Compliance.",
}

export default async function CenterApplyPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in?returnTo=/for-centers/apply")
  }

  const countries = await db
    .select({ code: countryT.code, nameAr: countryT.nameAr })
    .from(countryT)
    .where(eq(countryT.active, true))
    .orderBy(asc(countryT.sortOrder), asc(countryT.nameAr))

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <nav
            className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-label="مسار التنقل"
          >
            <Link href="/" className="hover:text-foreground">
              الرئيسية
            </Link>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            <Link href="/for-centers" className="hover:text-foreground">
              للمراكز
            </Link>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            <span className="font-medium text-foreground">تقديم طلب</span>
          </nav>

          <div className="mb-8 flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                طلب انضمام مركز تجميلي
              </h1>
              <p className="mt-1 text-muted-foreground">
                البيانات المطلوبة تخضع لمراجعة فريق Compliance. لن يظهر المركز
                للجمهور قبل اعتماد الطلب.
              </p>
            </div>
          </div>

          <Card className="mb-6 flex items-start gap-3 border-info/30 bg-info/5 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                خصوصية المستندات الحساسة
              </p>
              <p className="text-muted-foreground">
                يتم تشفير أرقام السجل التجاري وترخيص المنشأة قبل التخزين، ولا
                يظهر منها في لوحة الإدارة سوى آخر 4 أرقام. ستطلب Compliance
                مستندات إضافية عبر قناة مؤمَّنة إن لزم الأمر.
              </p>
            </div>
          </Card>

          <CenterApplicationForm countries={countries} />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
