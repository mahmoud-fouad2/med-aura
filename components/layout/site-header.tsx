import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileNav } from "@/components/layout/mobile-nav"
import { localizedPath } from "@/lib/i18n/config"

export async function SiteHeader() {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getI18n()])

  const navLinks = [
    { href: "/doctors", label: t.nav.doctors },
    { href: "/procedures", label: t.nav.procedures },
    { href: "/centers", label: t.nav.centers },
    { href: "/destinations", label: t.nav.destinations },
    { href: "/online-consultation", label: t.nav.onlineConsultation },
    { href: "/how-it-works", label: t.nav.howItWorks },
  ].map((link) => ({ ...link, href: localizedPath(link.href, locale) }))

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/92 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-1 sm:px-3 lg:px-5">
        <Link href={localizedPath("/", locale)} aria-label="Med Aura">
          <Logo className="h-10 sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground/88 transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* The landing hero owns search — a second search field in the header
            duplicated it on every page without adding reach, so the nav keeps
            its links and the hero keeps the search. */}

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <LanguageSwitcher locale={locale} />
          <div className="hidden lg:flex lg:items-center lg:gap-2">
            {user ? (
              <UserMenu name={user.name} email={user.email} />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg px-4"
                  render={<Link href={localizedPath("/sign-in", locale)}>{t.nav.signIn}</Link>}
                />
                <Button
                  size="sm"
                  className="rounded-lg px-5"
                  render={
                    <Link href={localizedPath("/sign-up", locale)}>{t.nav.startConsultation}</Link>
                  }
                />
              </>
            )}
          </div>
          <MobileNav
            links={navLinks}
            isAuthed={Boolean(user)}
            labels={{
              signIn: t.nav.signIn,
              start: t.nav.startConsultation,
              dashboard: t.nav.dashboard,
            }}
          />
        </div>
      </div>
    </header>
  )
}
