import Link from "next/link"
import Image from "next/image"
import { ShieldCheck, FileLock2, Star, ArrowRight } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { localizedPath } from "@/lib/i18n/config"
import type { Dictionary, Locale } from "@/lib/i18n"

/** Premium two-panel auth layout: brand story (left) + form (right).
 * Rendered from inside AuthForm ("use client"), so it can't call getI18n()
 * itself — the caller passes the dictionary slices down instead. */
export function AuthShell({
  children,
  locale,
  home,
  authShell,
}: {
  children: React.ReactNode
  locale: Locale
  home: Dictionary["home"]
  authShell: Dictionary["authShell"]
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-foreground p-12 text-white lg:flex lg:flex-col lg:justify-between shadow-2xl">
        <Image
          src="/hero-medaura-consultation.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-25 mix-blend-overlay"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <Link href={localizedPath("/", locale)} className="relative flex items-center gap-2.5">
          <Logo className="h-10 brightness-0 invert" />
        </Link>

        <div className="relative max-w-md space-y-6">
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl text-white">
            {home.heroTitle}
          </h2>
          <p className="text-sm leading-relaxed text-white/85">
            {home.heroSubtitle}
          </p>
          <ul className="space-y-3.5 text-sm">
            <Bullet icon={ShieldCheck} text={authShell.licenseCheck} />
            <Bullet icon={FileLock2} text={authShell.fileProtection} />
            <Bullet icon={Star} text={authShell.verifiedReviews} />
          </ul>
        </div>

        <Link
          href={localizedPath("/", locale)}
          className="relative inline-flex w-fit items-center gap-2 text-sm text-white/80 transition-colors hover:text-white group"
        >
          <ArrowRight className="size-4 ltr:rotate-180 transition-transform ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          {authShell.backHome}
        </Link>
      </aside>

      {/* form panel */}
      <main className="bg-background flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Link href={localizedPath("/", locale)} className="mb-8 flex items-center justify-center lg:hidden">
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
    <li className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/15">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold/25 text-gold">
        <Icon className="size-4" />
      </span>
      <span className="font-medium text-white/95">{text}</span>
    </li>
  )
}
