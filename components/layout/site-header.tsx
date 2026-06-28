import Link from "next/link"
import { Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/session"
import { UserMenu } from "@/components/layout/user-menu"

const navLinks = [
  { href: "/search", label: "ابحث عن علاج" },
  { href: "/doctors", label: "الأطباء" },
  { href: "/centers", label: "المراكز الطبية" },
  { href: "/how-it-works", label: "كيف نعمل" },
]

export async function SiteHeader() {
  const user = await getCurrentUser()

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            MED AURA
          </span>
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
          {user ? (
            <UserMenu name={user.name} email={user.email} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">دخول</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">ابدأ الآن</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
