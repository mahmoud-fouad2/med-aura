import Link from "next/link"
import {
  Settings2,
  Sparkles,
  Globe2,
  UserCog,
  Activity,
  Bell,
  ShieldCheck,
  Building,
  ArrowLeft,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from "@/lib/rbac"
import { getMigrationStatus } from "@/lib/db/migration-status"
import {
  isStripeConfigured,
  isStripeWebhookConfigured,
  isR2Configured,
  isEmailConfigured,
  isVideoConfigured,
  isRecaptchaConfigured,
} from "@/lib/env"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"
export const metadata = { title: "الإعدادات" }

export default async function AdminSettingsPage() {
  await requirePermissionPage(PERMISSIONS.ADMIN_ACCESS)
  const db = await getMigrationStatus()

  const integrations: { label: string; ok: boolean }[] = [
    { label: "قاعدة البيانات", ok: db.configured && db.connected && db.ready },
    { label: "بوابة الدفع (Stripe)", ok: isStripeConfigured() },
    { label: "إشعارات الدفع الفورية", ok: isStripeWebhookConfigured() },
    { label: "التخزين السحابي (R2)", ok: isR2Configured() },
    { label: "البريد (Resend)", ok: isEmailConfigured() },
    { label: "الفيديو للاستشارة", ok: isVideoConfigured() },
    { label: "reCAPTCHA", ok: isRecaptchaConfigured() },
  ]
  const activeCount = integrations.filter((i) => i.ok).length

  const roles = Object.values(ROLES)

  const sections = [
    {
      href: "/admin/procedures",
      label: "المحتوى والإجراءات",
      icon: Sparkles,
      desc: "الفئات، الإجراءات، الأسئلة الشائعة، والصور المرتبطة.",
      permission: PERMISSIONS.CATALOG_MANAGE,
    },
    {
      href: "/admin/geography",
      label: "الدول والمدن",
      icon: Globe2,
      desc: "الدول المتاحة للمرضى والمراكز وربطها بالمدن.",
      permission: PERMISSIONS.CATALOG_MANAGE,
    },
    {
      href: "/admin/users",
      label: "المستخدمون والصلاحيات",
      icon: UserCog,
      desc: "قائمة المستخدمين، أدوارهم، وحالة الحساب.",
      permission: PERMISSIONS.USER_READ_ANY,
    },
    {
      href: "/admin/system-health",
      label: "صحة النظام",
      icon: Activity,
      desc: "حالة قاعدة البيانات، عمليات الترحيل، والتكاملات.",
      permission: PERMISSIONS.ADMIN_ACCESS,
    },
    {
      href: "/dashboard/notifications",
      label: "قوالب الإشعارات",
      icon: Bell,
      desc: "معاينة الإشعارات الحية داخل المنصة.",
      external: true,
    },
    {
      href: "/admin/applications",
      label: "طلبات الانضمام",
      icon: Building,
      desc: "طلبات الأطباء والمراكز المعلّقة والمعتمدة والمرفوضة.",
      permission: PERMISSIONS.PROVIDER_REVIEW,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">الإعدادات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مركز التحكم في المحتوى، الصلاحيات، والتكاملات الخارجية.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Activity}
          label="التكاملات المفعّلة"
          value={`${activeCount} / ${integrations.length}`}
          tone={activeCount === integrations.length ? "success" : "warning"}
        />
        <StatCard
          icon={ShieldCheck}
          label="أدوار محفوظة"
          value={String(roles.length)}
          tone="neutral"
        />
        <StatCard
          icon={Settings2}
          label="أنواع الصلاحيات"
          value={String(Object.keys(PERMISSIONS).length)}
          tone="neutral"
        />
      </div>

      <Card className="space-y-3 p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">أقسام الإدارة</h2>
        <p className="text-sm text-muted-foreground">
          الوصول السريع لصفحات الإدارة والإعداد. تُخفى الأقسام التي لا تملك صلاحية الوصول إليها.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 font-medium text-foreground">
                  {s.label}
                  <ArrowLeft className="size-4 text-muted-foreground transition-transform rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5 group-hover:text-primary" />
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">الأدوار المعرَّفة</h2>
        <p className="text-sm text-muted-foreground">
          الأدوار الافتراضية المدمجة في النظام مع عدد الصلاحيات المرتبطة بكل دور.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">{roleAr(r)}</span>
              <span className="text-xs text-muted-foreground">
                {(ROLE_PERMISSIONS[r]?.length ?? 0).toLocaleString("ar-SA")} صلاحية
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">حالة التكاملات</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {integrations.map((i) => (
            <div
              key={i.label}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i.label}</span>
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                  (i.ok
                    ? "bg-success/10 text-success"
                    : "bg-warning/15 text-warning-foreground")
                }
              >
                {i.ok ? "مفعّلة" : "غير مهيأة"}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: "success" | "warning" | "neutral"
}) {
  const toneClasses =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-primary/10 text-primary"
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={"flex size-10 shrink-0 items-center justify-center rounded-xl " + toneClasses}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      </div>
    </Card>
  )
}

function roleAr(r: string): string {
  const MAP: Record<string, string> = {
    patient: "مريض",
    doctor: "طبيب",
    center_admin: "مدير مركز",
    center_staff: "موظف مركز",
    concierge: "متابعة تشغيلية",
    compliance: "الامتثال",
    finance: "المالية",
    admin: "مسؤول",
  }
  return MAP[r] ?? r
}
