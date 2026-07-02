import { redirect } from "next/navigation"
import { requireAuthPage } from "@/lib/session"
import { getUserPermissions } from "@/lib/rbac"
import { getLocale } from "@/lib/i18n"
import { getUnreadNotificationCount } from "@/lib/data/notifications"
import { ADMIN_SHELL_ENTRY_PERMISSIONS, visibleAdminNav } from "@/lib/admin-nav"
import { AdminShell } from "@/components/admin/admin-shell"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuthPage("/admin")
  const perms = await getUserPermissions(user.id)

  // Broad entry gate: any operational-oversight permission gets you into the
  // shell; each individual page re-checks its own specific permission, and
  // the sidebar never renders a link the user can't actually open.
  const canEnter = ADMIN_SHELL_ENTRY_PERMISSIONS.some((p) => perms.has(p))
  if (!canEnter) redirect("/403")

  const [locale, unreadNotifications] = await Promise.all([
    getLocale(),
    getUnreadNotificationCount(user.id),
  ])

  const nav = visibleAdminNav(perms)

  return (
    <AdminShell user={user} nav={nav} locale={locale} unreadNotifications={unreadNotifications}>
      {children}
    </AdminShell>
  )
}
