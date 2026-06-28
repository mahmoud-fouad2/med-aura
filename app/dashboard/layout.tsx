import { requireAuthPage, currentUserRoles } from "@/lib/session"
import { ROLES } from "@/lib/rbac"
import { AppShell, type ShellNavLink } from "@/components/layout/app-shell"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthPage("/dashboard")
  const roles = await currentUserRoles()

  const nav: ShellNavLink[] = [{ href: "/dashboard", label: "الرئيسية" }]
  nav.push({ href: "/dashboard/cases", label: "حالاتي" })
  nav.push({ href: "/dashboard/appointments", label: "مواعيدي" })
  if (roles.includes(ROLES.DOCTOR)) {
    nav.push({ href: "/dashboard/doctor", label: "لوحة الطبيب" })
  }
  if (
    roles.includes(ROLES.SUPER_ADMIN) ||
    roles.includes(ROLES.COMPLIANCE_REVIEWER)
  ) {
    nav.push({ href: "/admin", label: "الإدارة" })
  }

  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  )
}
