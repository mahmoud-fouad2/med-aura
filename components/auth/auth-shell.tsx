import Link from "next/link"
import Image from "next/image"
import { ShieldCheck, FileLock2, Star, ArrowRight } from "lucide-react"
import { Logo } from "@/components/brand/logo"
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
      <aside className="bg-foreground relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/hero-medaura-consultation.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-35"
          sizes="50vw"
        />
        <div className="bg-foreground/60 absolute inset-0" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <Logo className="h-10 brightness-0 invert" />
        </Link>

        <div className="relative max-w-md space-y-6">
          <h2 className="font-heading text-3xl leading-tight font-bold">{home.heroTitle}</h2>
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
      <main className="bg-background flex items-center justify-center px-4 py-12">
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
