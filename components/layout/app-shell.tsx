import Link from "next/link"
import { Bell } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { NavLinks } from "@/components/layout/nav-links"
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav"
import { getLocale } from "@/lib/i18n"

export type ShellNavLink = { href: string; label: string }

export async function AppShell({
  user,
  nav,
  unreadNotifications = 0,
  children,
}: {
  user: { name: string; email: string }
  nav: ShellNavLink[]
  unreadNotifications?: number
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <div className="flex min-h-svh flex-col bg-section-soft">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-1 sm:px-3 lg:px-5">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" aria-label="Med Aura">
              <Logo className="h-9" />
            </Link>
            <NavLinks links={nav} className="hidden items-center gap-1 md:flex" />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              aria-label="الإشعارات"
              className="relative flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Bell className="size-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <ThemeToggle className="hidden sm:inline-flex" />
            <LanguageSwitcher locale={locale} />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
        <div className="mx-auto max-w-7xl">
          <DashboardMobileNav
            nav={nav}
            label={locale === "ar" ? "أقسام لوحة التحكم" : "Dashboard sections"}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
