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
  Plug,
  CheckCircle2,
  XCircle,
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
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"

export const dynamic = "force-dynamic"
export const metadata = { title: "الإعدادات" }

export default async function AdminSettingsPage() {
  await requirePermissionPage(PERMISSIONS.ADMIN_ACCESS)
  const db = await getMigrationStatus()

  const integrations: { label: string; ok: boolean; hint?: string }[] = [
    {
      label: "قاعدة البيانات",
      ok: db.configured && db.connected && db.ready,
      hint: db.ready
        ? `${db.appliedCount}/${db.journalCount} ترحيل مطبَّق`
        : "غير جاهزة",
    },
    { label: "بوابة الدفع الإلكتروني", ok: isStripeConfigured() },
    { label: "إشعارات الدفع الفورية", ok: isStripeWebhookConfigured() },
    { label: "التخزين السحابي للملفات", ok: isR2Configured() },
    { label: "خدمة البريد الإلكتروني", ok: isEmailConfigured() },
    { label: "الفيديو للاستشارة", ok: isVideoConfigured() },
    { label: "الحماية من الروبوتات", ok: isRecaptchaConfigured() },
  ]
  const activeCount = integrations.filter((i) => i.ok).length

  const roles = Object.values(ROLES)

  const sections = [
    {
      href: "/admin/procedures",
      label: "المحتوى والإجراءات",
      icon: Sparkles,
      desc: "الفئات، الإجراءات، الأسئلة الشائعة، والصور المرتبطة.",
    },
    {
      href: "/admin/geography",
      label: "الدول والمدن",
      icon: Globe2,
      desc: "الدول المتاحة للمرضى والمراكز وربطها بالمدن.",
    },
    {
      href: "/admin/users",
      label: "المستخدمون والصلاحيات",
      icon: UserCog,
      desc: "قائمة المستخدمين، أدوارهم، وحالة الحساب.",
    },
    {
      href: "/admin/system-health",
      label: "صحة النظام",
      icon: Activity,
      desc: "حالة قاعدة البيانات والخدمات المتصلة.",
    },
    {
      href: "/dashboard/notifications",
      label: "قوالب الإشعارات",
      icon: Bell,
      desc: "معاينة الإشعارات الحية داخل المنصة.",
    },
    {
      href: "/admin/applications",
      label: "طلبات الانضمام",
      icon: Building,
      desc: "طلبات الأطباء والمراكز المعلّقة والمعتمدة والمرفوضة.",
    },
  ]

  const activeIntegrations = activeCount === integrations.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مركز التحكم"
        title="الإعدادات"
        description="مركز التحكم في المحتوى، الصلاحيات، والتكاملات الخارجية للمنصة."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={Plug}
          label="تكاملات مفعّلة"
          value={`${activeCount} / ${integrations.length}`}
          hint={
            activeIntegrations
              ? "كل الخدمات جاهزة"
              : `${integrations.length - activeCount} خدمة تحتاج تهيئة`
          }
          tone={activeIntegrations ? "success" : "warning"}
          emphasis
        />
        <MetricCard
          icon={ShieldCheck}
          label="أدوار محفوظة"
          value={roles.length.toLocaleString("ar-SA-u-nu-latn")}
          hint="متاحة للتعيين على المستخدمين"
          tone="primary"
          emphasis
        />
        <MetricCard
          icon={Settings2}
          label="أنواع الصلاحيات"
          value={Object.keys(PERMISSIONS).length.toLocaleString("ar-SA-u-nu-latn")}
          hint="مسجَّلة في مصفوفة الأدوار"
          tone="neutral"
          emphasis
        />
      </div>

      <SectionCard
        icon={Sparkles}
        title="أقسام الإدارة"
        description="الوصول السريع لصفحات الإدارة والإعداد. تُخفى الأقسام التي لا تملك صلاحية الوصول إليها."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-start gap-3 rounded-xl border border-border/70 bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                <s.icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 font-medium text-foreground">
                  {s.label}
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground/60 transition-all rtl:rotate-0 ltr:rotate-180 group-hover:text-primary rtl:group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          icon={ShieldCheck}
          title="الأدوار المعرَّفة"
          description="الأدوار الافتراضية المدمجة مع عدد الصلاحيات لكل منها."
        >
          <div className="grid gap-2 p-5 sm:grid-cols-2">
            {roles.map((r) => (
              <div
                key={r}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{roleAr(r)}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                  {(ROLE_PERMISSIONS[r]?.length ?? 0).toLocaleString("ar-SA-u-nu-latn")}{" "}
                  صلاحية
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={Plug}
          title="حالة التكاملات"
          description="التكاملات الخارجية وحالة تهيئتها. لا يتم عرض أي مفاتيح."
          tone={activeIntegrations ? "success" : "warning"}
        >
          <ul className="divide-y divide-border/60">
            {integrations.map((i) => (
              <li
                key={i.label}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full " +
                      (i.ok
                        ? "bg-success/12 text-success"
                        : "bg-warning/15 text-warning-foreground")
                    }
                  >
                    {i.ok ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{i.label}</p>
                    {i.hint && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {i.hint}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (i.ok
                      ? "bg-success/10 text-success"
                      : "bg-warning/15 text-warning-foreground")
                  }
                >
                  {i.ok ? "مفعّلة" : "غير مهيأة"}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}

function roleAr(r: string): string {
  const MAP: Record<string, string> = {
    patient: "مريض",
    doctor: "طبيب",
    center_admin: "مدير مركز",
    center_staff: "موظف مركز",
    center_owner: "مالك مركز",
    concierge: "متابعة تشغيلية",
    compliance: "الامتثال",
    compliance_reviewer: "الامتثال",
    finance: "المالية",
    finance_admin: "المالية",
    support_agent: "دعم",
    content_admin: "محتوى",
    admin: "مسؤول",
    super_admin: "مسؤول أعلى",
  }
  return MAP[r] ?? r
}
