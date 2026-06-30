import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { AppShell, type ShellNavLink } from "@/components/layout/app-shell"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side gate: only users with compliance access (or super admin) pass.
  const user = await requirePermissionPage(PERMISSIONS.COMPLIANCE_ACCESS)

  const nav: ShellNavLink[] = [
    { href: "/admin", label: "الإدارة" },
    { href: "/admin/applications", label: "طلبات الانضمام" },
    { href: "/admin/system-health", label: "صحة النظام" },
  ]

  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  )
}
