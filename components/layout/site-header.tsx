import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function SiteHeader() {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getI18n()])

  // Only link to routes that actually exist (no 404s).
  const navLinks = [
    { href: "/search", label: t.nav.doctors },
    { href: "/procedures", label: t.nav.procedures },
    { href: "/centers", label: t.nav.centers },
    { href: "/destinations", label: "الوجهات" },
    { href: "/online-consultation", label: "الاستشارة أونلاين" },
    { href: "/how-it-works", label: t.nav.howItWorks },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/70 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[96rem] items-center justify-between gap-4 rounded-[1.65rem] border border-border/70 bg-card/92 px-4 shadow-elegant sm:px-6 lg:px-8">
        <Link href="/" aria-label="Med Aura">
          <Logo className="h-10 sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-foreground/74 transition-colors hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
                  className="rounded-full px-4"
                  render={<Link href="/sign-in">{t.nav.signIn}</Link>}
                />
                <Button
                  size="sm"
                  className="rounded-full px-5 shadow-sm shadow-primary/20"
                  render={
                    <Link href="/sign-up">{t.nav.startConsultation}</Link>
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
