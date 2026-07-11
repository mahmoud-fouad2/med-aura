import Link from "next/link"
import { Bell } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NavLinks } from "@/components/layout/nav-links"
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
      <header className="sticky top-0 z-40 bg-background/72 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 rounded-[1.45rem] border border-border/70 bg-card/92 px-4 shadow-elegant sm:px-6 lg:px-8">
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
            <LanguageSwitcher locale={locale} />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
        <NavLinks
          links={nav}
          className="mx-auto mt-2 flex max-w-7xl items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/85 px-3 py-2 shadow-sm md:hidden"
          itemClassName="whitespace-nowrap"
        />
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
