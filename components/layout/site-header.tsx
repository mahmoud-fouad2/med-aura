import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/session"
import { getI18n } from "@/lib/i18n"
import { Logo } from "@/components/brand/logo"
import { UserMenu } from "@/components/layout/user-menu"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function SiteHeader() {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getI18n()])

  // Only link to routes that actually exist (no 404s).
  const navLinks = [
    { href: "/search", label: t.nav.doctors },
    { href: "/how-it-works", label: t.nav.howItWorks },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Med Aura">
          <Logo markClassName="h-9 w-9" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <div className="hidden md:flex md:items-center md:gap-2">
            {user ? (
              <UserMenu name={user.name} email={user.email} />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href="/sign-in">{t.nav.signIn}</Link>}
                />
                <Button
                  size="sm"
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
