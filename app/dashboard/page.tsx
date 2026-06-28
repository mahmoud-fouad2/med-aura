import Link from "next/link"
import { Search, FileText, Stethoscope, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getCurrentUser, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { db } from "@/lib/db"
import { providerApplication } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export default async function DashboardHome() {
  const user = (await getCurrentUser())!
  const roles = await currentUserRoles()
  const isDoctor = roles.includes(ROLES.DOCTOR)
  const isAdmin =
    roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.COMPLIANCE_REVIEWER)

  const lastApp = (
    await db
      .select({ status: providerApplication.status })
      .from(providerApplication)
      .where(eq(providerApplication.applicantUserId, user.id))
      .orderBy(desc(providerApplication.createdAt))
      .limit(1)
  )[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          مرحبًا، {user.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          من هنا تدير رحلتك التجميلية على Med Aura.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          href="/search"
          icon={Search}
          title="ابحث عن طبيب"
          desc="تصفّح أطباء التجميل المعتمدين وابدأ حالتك."
        />
        <DashCard
          href="/dashboard/cases"
          icon={FileText}
          title="حالاتي"
          desc="تابع حالاتك التجميلية والمستندات والموافقات."
        />

        {isAdmin && (
          <DashCard
            href="/admin"
            icon={ShieldCheck}
            title="لوحة الإدارة"
            desc="مراجعة طلبات مقدّمي الخدمة والإشراف على المنصة."
          />
        )}

        {isDoctor && (
          <DashCard
            href="/dashboard/doctor"
            icon={Stethoscope}
            title="لوحة الطبيب"
            desc="مواعيدك والحالات المشتركة معك."
          />
        )}

        {!isDoctor && (
          <DashCard
            href="/dashboard/provider/apply"
            icon={Stethoscope}
            title="انضم كمقدّم خدمة"
            desc={
              lastApp
                ? `حالة طلبك: ${applicationStatusAr(lastApp.status)}`
                : "هل أنت طبيب تجميل؟ قدّم طلب انضمام للمراجعة."
            }
          />
        )}
      </div>
    </div>
  )
}

function DashCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-3 font-heading text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </Card>
    </Link>
  )
}

function applicationStatusAr(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "مسودة",
    SUBMITTED: "تم الإرسال",
    UNDER_REVIEW: "قيد المراجعة",
    NEEDS_CHANGES: "بحاجة لتعديل",
    APPROVED: "تمت الموافقة",
    REJECTED: "مرفوض",
  }
  return map[status] ?? status
}
