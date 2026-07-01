import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NavLinks } from "@/components/layout/nav-links"
import { getLocale } from "@/lib/i18n"

export type ShellNavLink = { href: string; label: string }

export async function AppShell({
  user,
  nav,
  children,
}: {
  user: { name: string; email: string }
  nav: ShellNavLink[]
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" aria-label="Med Aura">
              <Logo className="h-8" />
            </Link>
            <NavLinks links={nav} className="hidden items-center gap-1 md:flex" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
        <NavLinks
          links={nav}
          className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden"
          itemClassName="whitespace-nowrap"
        />
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
