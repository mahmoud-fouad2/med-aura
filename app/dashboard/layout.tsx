import { requireAuthPage, currentUserRoles } from "@/lib/session"
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/rbac"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { AppShell, type ShellNavLink } from "@/components/layout/app-shell"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthPage("/dashboard")
  const [roles, unreadNotifications, canCenter, canConcierge, canFinance] = await Promise.all([
    currentUserRoles(),
    getUnreadNotificationCount(user.id),
    hasPermission(user.id, PERMISSIONS.CENTER_DASHBOARD_ACCESS),
    hasPermission(user.id, PERMISSIONS.CONCIERGE_ACCESS),
    hasPermission(user.id, PERMISSIONS.FINANCE_ACCESS),
  ])

  const nav: ShellNavLink[] = [{ href: "/dashboard", label: "الرئيسية" }]
  nav.push({ href: "/dashboard/cases", label: "حالاتي" })
  nav.push({ href: "/dashboard/appointments", label: "مواعيدي" })
  if (roles.includes(ROLES.DOCTOR)) {
    nav.push({ href: "/dashboard/doctor", label: "لوحة الطبيب" })
  }
  if (canCenter) {
    nav.push({ href: "/dashboard/center", label: "لوحة المركز" })
  }
  if (canConcierge) {
    nav.push({ href: "/admin/concierge", label: "لوحة المتابعة" })
  }
  if (canFinance) {
    nav.push({ href: "/admin/finance", label: "لوحة المالية" })
  }
  if (
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.COMPLIANCE_REVIEWER)
  ) {
    nav.push({ href: "/admin", label: "الإدارة" })
  }

  return (
    <AppShell user={user} nav={nav} unreadNotifications={unreadNotifications}>
      {children}
    </AppShell>
  )
}
