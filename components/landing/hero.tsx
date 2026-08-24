import Link from "next/link"
import Image from "next/image"
import {
  Search,
  ShieldCheck,
  FileLock2,
  Star,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FadeIn } from "@/components/motion"
import type { Dictionary, Locale } from "@/lib/i18n"
import { localizedPath } from "@/lib/i18n/config"

const quickSearches = [
  { label: "تجميل الأنف", labelEn: "Rhinoplasty", q: "تجميل الأنف" },
  { label: "شد الوجه", labelEn: "Facelift", q: "شد الوجه" },
  { label: "البوتوكس", labelEn: "Botox", q: "البوتوكس" },
  { label: "زراعة الشعر", labelEn: "Hair Transplant", q: "زراعة الشعر" },
]

export function Hero({ 
  t, 
  tCommon, 
  locale 
}: { 
  t: Dictionary["home"]
  tCommon: Dictionary["common"]
  locale: Locale
}) {
  const isAr = locale === "ar"

  const trustPoints = [
    { icon: Star, label: isAr ? "تقييمات موثّقة" : "Verified Reviews" },
    { icon: FileLock2, label: isAr ? "حماية ملفاتك الطبية" : "Medical File Protection" },
    { icon: ShieldCheck, label: isAr ? "تحقّق من التراخيص" : "License Verification" },
  ]

  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-background">
      <Image
        src="/hero-medaura-consultation.png"
        alt={isAr ? "استشارة تجميلية في عيادة Med Aura" : "Aesthetic consultation at Med Aura"}
        fill
        priority
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 -z-20 object-cover object-left"
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--background)_78%,transparent)_43%,var(--background)_68%,var(--background)_100%)] ltr:bg-[linear-gradient(270deg,transparent_0%,color-mix(in_oklab,var(--background)_78%,transparent)_43%,var(--background)_68%,var(--background)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center px-4 py-14 sm:px-6 sm:py-16 lg:min-h-[620px] lg:max-h-[760px] lg:px-8">
        <FadeIn className="me-auto flex w-full max-w-2xl flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/20 bg-background/85 px-3 py-1.5 text-sm font-semibold text-primary backdrop-blur-md">
            <Sparkles className="size-4 text-gold" />
            {isAr ? "اختيارك الجمالي يبدأ بخبير موثوق" : "Trusted aesthetic care, clearly guided"}
          </span>

          <h1 className="text-balance font-heading text-4xl font-bold leading-[1.15] text-foreground sm:text-5xl lg:text-6xl">
            {t.heroTitle}
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-8 text-foreground/75 sm:text-xl">
            {t.heroSubtitle}
          </p>

          <form
            action={localizedPath("/search", locale)}
            method="get"
            className="flex w-full max-w-2xl items-center gap-2 rounded-lg border border-border/70 bg-card/94 p-2 shadow-elegant backdrop-blur-md"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder={t.searchPlaceholder}
                className="h-14 border-0 bg-transparent ps-12 text-base shadow-none focus-visible:ring-0 focus:ring-0"
                aria-label={t.searchPlaceholder}
              />
            </div>
            <Button type="submit" size="lg" className="h-14 shrink-0 rounded-lg px-5 sm:px-7">
              <Search className="size-5" />
              <span className="hidden sm:inline">{tCommon.search}</span>
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {isAr ? "إجراءات شائعة:" : "Popular:"}
            </span>
            {quickSearches.map((s) => (
              <Link
                key={s.label}
                href={`${localizedPath("/search", locale)}?q=${encodeURIComponent(s.q)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/15 bg-background/82 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:border-primary/35 hover:text-primary"
              >
                <Sparkles className="size-3.5 text-gold" />
                {isAr ? s.label : s.labelEn}
              </Link>
            ))}
          </div>

          <div className="grid max-w-2xl gap-3 pt-3 sm:grid-cols-3">
            {trustPoints.map((tp) => (
              <TrustPoint key={tp.label} icon={tp.icon} label={tp.label} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function TrustPoint({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
}) {
  return (
    <div className="group flex items-center gap-2.5 rounded-xl border border-primary/15 bg-card/85 px-3.5 py-3 backdrop-blur-md shadow-sm transition-all duration-300 hover:border-gold/40 hover:shadow-elegant">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold transition-transform duration-300 group-hover:scale-110">
        <Icon className="size-4.5" aria-hidden="true" />
      </div>
      <span className="text-xs sm:text-sm font-semibold leading-snug text-foreground/90">
        {label}
      </span>
    </div>
  )
}
