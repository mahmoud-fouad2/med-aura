import Link from "next/link"
import { Search, ShieldCheck, FileLock2, Stars } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogoMark } from "@/components/brand/logo"
import type { Dictionary } from "@/lib/i18n"

export function Hero({ t }: { t: Dictionary["home"] }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            أطباء ومراكز تجميل معتمدون وموثّقون
          </span>
          <h1 className="text-balance font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t.heroTitle}
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.heroSubtitle}
          </p>

          {/* Real search — submits to the database-backed /search page */}
          <form
            action="/search"
            method="get"
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder={t.searchPlaceholder}
                className="h-12 pr-10 text-base"
                aria-label={t.searchPlaceholder}
              />
            </div>
            <Button type="submit" size="lg" className="h-12 gap-2 px-6">
              <Search className="size-5" />
              بحث
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm text-muted-foreground">
            <TrustPoint icon={ShieldCheck} label="تحقّق من التراخيص" />
            <TrustPoint icon={FileLock2} label="حماية ملفاتك الطبية" />
            <TrustPoint icon={Stars} label="تقييمات من معاملات موثّقة" />
          </div>
        </div>

        {/* Branded abstract visual (no stock/placeholder photography) */}
        <div className="relative hidden lg:block">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-primary/15 via-secondary to-background shadow-xl">
            <div className="absolute -top-16 -left-16 size-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 size-72 rounded-full bg-accent/40 blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-primary/80">
                <LogoMark className="size-40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustPoint({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      {label}
    </span>
  )
}
