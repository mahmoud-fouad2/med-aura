import { requireAuthPage, currentUserRoles } from "@/lib/session"
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/rbac"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { AppShell, type ShellNavLink } from "@/components/layout/app-shell"
import { getLocale } from "@/lib/i18n"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthPage("/dashboard")
  const [roles, unreadNotifications, canCenter, canConcierge, canFinance, locale] = await Promise.all([
    currentUserRoles(),
    getUnreadNotificationCount(user.id),
    hasPermission(user.id, PERMISSIONS.CENTER_DASHBOARD_ACCESS),
    hasPermission(user.id, PERMISSIONS.CONCIERGE_ACCESS),
    hasPermission(user.id, PERMISSIONS.FINANCE_ACCESS),
    getLocale(),
  ])

  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const isPatient = roles.includes(ROLES.PATIENT)
  const isDoctor = roles.includes(ROLES.DOCTOR)
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.COMPLIANCE_REVIEWER)
  const homeHref = isPatient ? "/dashboard" : isDoctor ? "/dashboard/doctor" : isAdmin ? "/admin" : "/dashboard/support"
  const nav: ShellNavLink[] = [{ href: homeHref, label: l("الرئيسية", "Home") }]
  if (isPatient) {
    nav.push({ href: "/dashboard/cases", label: l("حالاتي", "My cases") })
    nav.push({ href: "/dashboard/appointments", label: l("مواعيدي", "Appointments") })
  }
  nav.push({ href: "/dashboard/support", label: l("الدعم", "Support") })
  if (roles.includes(ROLES.DOCTOR)) {
    nav.push({ href: "/dashboard/doctor", label: l("مساحة الطبيب", "Doctor workspace") })
  }
  if (canCenter) {
    nav.push({ href: "/dashboard/center", label: l("مساحة المركز", "Center workspace") })
  }
  if (canConcierge) {
    nav.push({ href: "/admin/concierge", label: l("المتابعة", "Care coordination") })
  }
  if (canFinance) {
    nav.push({ href: "/admin/finance", label: l("المالية", "Finance") })
  }
  if (
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.COMPLIANCE_REVIEWER)
  ) {
    nav.push({ href: "/admin", label: l("الإدارة", "Administration") })
  }

  return (
    <AppShell user={user} nav={nav} unreadNotifications={unreadNotifications}>
      {children}
    </AppShell>
  )
}
