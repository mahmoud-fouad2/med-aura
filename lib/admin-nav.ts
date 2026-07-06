import type { PermissionKey } from "@/lib/rbac"
import { PERMISSIONS } from "@/lib/rbac"

export type AdminNavItem = {
  href: string
  label: string
  icon: string
  /** Any ONE of these permissions is enough to see the link. Empty = always
   * visible to anyone who already passed the shell's entry gate. */
  anyOf: PermissionKey[]
  /** External to /admin/* — still rendered inside the shell, just a different route root. */
  external?: boolean
}

export type AdminNavGroup = {
  title: string
  items: AdminNavItem[]
}

const P = PERMISSIONS

/**
 * Single source of truth for the admin sidebar. Each item lists the
 * permission(s) that unlock it — the sidebar never renders a link the current
 * user cannot open, and each destination page re-checks the same permission
 * server-side (never relies on the link being hidden).
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "عام",
    items: [
      { href: "/admin", label: "نظرة عامة", icon: "LayoutDashboard", anyOf: [P.ADMIN_ACCESS, P.COMPLIANCE_ACCESS, P.FINANCE_ACCESS, P.CONCIERGE_ACCESS, P.CENTER_DASHBOARD_ACCESS] },
    ],
  },
  {
    title: "الرعاية",
    items: [
      { href: "/admin/cases", label: "الحالات الطبية", icon: "FileHeart", anyOf: [P.CASE_READ_ANY] },
      { href: "/admin/patients", label: "المرضى", icon: "Users", anyOf: [P.USER_READ_ANY] },
      { href: "/admin/consultations", label: "طلبات الاستشارة", icon: "CalendarClock", anyOf: [P.APPOINTMENT_READ_ANY] },
      { href: "/admin/follow-ups", label: "المتابعات", icon: "ClipboardList", anyOf: [P.CASE_READ_ANY] },
      { href: "/admin/safety-alerts", label: "تنبيهات السلامة", icon: "ShieldAlert", anyOf: [P.SAFETY_ALERT_MANAGE] },
    ],
  },
  {
    title: "مقدّمو الخدمة",
    items: [
      { href: "/admin/doctors", label: "الأطباء", icon: "Stethoscope", anyOf: [P.PROVIDER_REVIEW] },
      { href: "/admin/centers", label: "المراكز", icon: "Building2", anyOf: [P.PROVIDER_REVIEW] },
      { href: "/admin/applications", label: "طلبات الانضمام", icon: "ClipboardCheck", anyOf: [P.PROVIDER_REVIEW] },
    ],
  },
  {
    title: "التشغيل",
    items: [
      { href: "/admin/concierge", label: "فريق المتابعة", icon: "KanbanSquare", anyOf: [P.CONCIERGE_ACCESS] },
      { href: "/admin/travel", label: "طلبات السفر", icon: "Plane", anyOf: [P.TRAVEL_OFFER_MANAGE] },
      { href: "/dashboard/center", label: "لوحة المركز", icon: "Building", anyOf: [P.CENTER_DASHBOARD_ACCESS], external: true },
    ],
  },
  {
    title: "المالية",
    items: [
      { href: "/admin/finance", label: "المدفوعات والفواتير", icon: "Wallet", anyOf: [P.FINANCE_ACCESS] },
      { href: "/admin/finance#refunds", label: "الاسترجاعات", icon: "Undo2", anyOf: [P.FINANCE_ACCESS] },
    ],
  },
  {
    title: "التواصل",
    items: [
      { href: "/dashboard/notifications", label: "الإشعارات", icon: "Bell", anyOf: [], external: true },
    ],
  },
  {
    title: "المحتوى والإعداد",
    items: [
      { href: "/admin/procedures", label: "المحتوى والإجراءات", icon: "Sparkles", anyOf: [P.CATALOG_MANAGE] },
      { href: "/admin/before-after", label: "قبل وبعد — المراجعة", icon: "ImageIcon", anyOf: [P.BEFORE_AFTER_MODERATE] },
      { href: "/admin/geography", label: "الدول والمدن", icon: "Globe2", anyOf: [P.CATALOG_MANAGE] },
      { href: "/admin/users", label: "المستخدمون والصلاحيات", icon: "UserCog", anyOf: [P.USER_READ_ANY] },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/admin/activity", label: "سجل النشاط", icon: "History", anyOf: [P.AUDIT_READ] },
      { href: "/admin/system-health", label: "صحة النظام", icon: "Activity", anyOf: [P.ADMIN_ACCESS] },
      { href: "/admin/settings", label: "الإعدادات", icon: "Settings2", anyOf: [P.ADMIN_ACCESS] },
    ],
  },
]

/** The permission set that unlocks entry to the admin shell at all (checked in app/admin/layout.tsx). */
export const ADMIN_SHELL_ENTRY_PERMISSIONS: PermissionKey[] = [
  P.ADMIN_ACCESS,
  P.COMPLIANCE_ACCESS,
  P.FINANCE_ACCESS,
  P.CONCIERGE_ACCESS,
  P.CENTER_DASHBOARD_ACCESS,
]

export function visibleAdminNav(userPerms: Set<PermissionKey>): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.anyOf.length === 0 || item.anyOf.some((p) => userPerms.has(p)),
    ),
  })).filter((group) => group.items.length > 0)
}
