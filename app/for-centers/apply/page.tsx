import Link from "next/link"
import { redirect } from "next/navigation"
import { asc, desc, eq } from "drizzle-orm"
import { Building2, ShieldCheck, ChevronLeft, AlertTriangle } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { country as countryT, providerApplication } from "@/lib/db/schema"
import { CenterApplicationForm } from "@/components/provider/center-application-form"
import type { CenterApplicationInput } from "@/lib/actions/provider"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "سجّل مركزك",
  description:
    "قدّم طلب انضمام مركزك التجميلي إلى Med Aura ليتم اعتماده ونشره بعد مراجعة فريق المراجعة والاعتماد.",
}

export default async function CenterApplyPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/sign-in?returnTo=/for-centers/apply")
  }

  const open = (
    await db
      .select({
        status: providerApplication.status,
        notes: providerApplication.reviewerNotes,
        payload: providerApplication.payload,
      })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .orderBy(desc(providerApplication.createdAt))
      .limit(1)
  )[0]

  if (open && (open.status === "SUBMITTED" || open.status === "UNDER_REVIEW")) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1 bg-muted/20">
          <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
            <Card className="p-6">
              <h1 className="font-heading text-xl font-bold text-foreground">
                طلب الانضمام قيد المراجعة
              </h1>
              <p className="mt-2 text-muted-foreground">
                استلمنا طلبكم وسيقوم فريق الاعتماد بمراجعته والتحقق من التراخيص.
                سنخطركم بالنتيجة قريبًا.
              </p>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const needsChanges = open?.status === "NEEDS_CHANGES"

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
                البيانات المطلوبة تخضع لمراجعة فريق المراجعة والاعتماد. لن يظهر المركز
                للجمهور قبل اعتماد الطلب.
              </p>
            </div>
          </div>

          {needsChanges && (
            <Card className="mb-6 flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  فريق الاعتماد طلب تعديلًا قبل المتابعة
                </p>
                <p className="text-sm text-muted-foreground">
                  {open?.notes || "يرجى مراجعة بياناتكم وإعادة الإرسال."}
                </p>
              </div>
            </Card>
          )}

          <Card className="mb-6 flex items-start gap-3 border-info/30 bg-info/5 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                خصوصية المستندات الحساسة
              </p>
              <p className="text-muted-foreground">
                نحفظ أرقام السجل التجاري وترخيص المنشأة بعناية، ولا يظهر لفريق
                المراجعة إلا آخر 4 أرقام. قد يطلب فريق المراجعة والاعتماد
                مستندات إضافية عند الحاجة.
              </p>
            </div>
          </Card>

          <CenterApplicationForm
            countries={countries}
            defaultValues={needsChanges ? (open?.payload as Partial<CenterApplicationInput>) : undefined}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
