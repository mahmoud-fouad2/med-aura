import Link from "next/link"
import { ShieldCheck, FileLock2, Star, ArrowRight } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"
import type { Dictionary } from "@/lib/i18n"

/** Premium two-panel auth layout: brand story (left) + form (right).
 * Rendered from inside AuthForm ("use client"), so it can't call getI18n()
 * itself — the caller passes the dictionary slices down instead. */
export function AuthShell({
  children,
  home,
  authShell,
}: {
  children: React.ReactNode
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[oklch(0.24_0.05_280)] via-[oklch(0.3_0.1_290)] to-[oklch(0.42_0.16_300)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 size-96 rounded-full bg-white/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="text-white">
            <LogoMark className="size-9" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-[0.18em]">
            MED<span className="opacity-80"> AURA</span>
          </span>
        </Link>

        <div className="relative max-w-md space-y-6">
          <h2 className="font-heading text-3xl font-extrabold leading-tight">
            {home.heroTitle}
          </h2>
          <p className="text-white/80">{home.heroSubtitle}</p>
          <ul className="space-y-3 text-sm">
            <Bullet icon={ShieldCheck} text={authShell.licenseCheck} />
            <Bullet icon={FileLock2} text={authShell.fileProtection} />
            <Bullet icon={Star} text={authShell.verifiedReviews} />
          </ul>
        </div>

        <Link
          href="/"
          className="relative inline-flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowRight className="size-4 ltr:rotate-180" />
          {authShell.backHome}
        </Link>
      </aside>

      {/* form panel */}
      <main className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center justify-center lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}

function Bullet({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
        <Icon className="size-4" />
      </span>
      {text}
    </li>
  )
}
