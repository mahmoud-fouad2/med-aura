import Link from "next/link"
import { Download, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { AndroidMark } from "@/components/brand/android-mark"
import { getI18n } from "@/lib/i18n"
import { localizedPath, type Locale } from "@/lib/i18n/config"

/** First-party download path — /download/android streams the latest build
    through our own domain (see app/download/android/route.ts). */
const APK_DOWNLOAD_URL = "/download/android"

export async function SiteFooter() {
  const year = new Date().getFullYear()
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => isAr ? ar : en

  return (
    <footer className="relative isolate overflow-hidden border-t border-border bg-gradient-to-b from-secondary/40 via-background to-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
      >
        <svg
          className="h-full w-full text-primary/6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="footer-dots"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-dots)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Link href={localizedPath("/", locale)} aria-label="Med Aura" className="w-fit">
              <Logo />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {l("اختر طبيبك أو مركزك بثقة، وتابع رحلتك من الاستشارة حتى ما بعد الإجراء.", "Choose your doctor or center with confidence, from consultation through aftercare.")}
            </p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                {l("مقدمو رعاية يتم قبولهم بعناية", "Carefully selected providers")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-gold" />
                {l("خطوات واضحة من البحث حتى الحجز", "Clear steps from search to booking")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake className="size-4 text-primary" />
                {l("دعم عندما تحتاج المساعدة", "Support when you need it")}
              </span>
            </div>
            {/* Store-style badge: the Android mark makes the platform obvious
                before the label is read, and the dark surface matches how
                official store badges are presented. */}
            <a
              href={APK_DOWNLOAD_URL}
              className="group inline-flex w-fit items-center gap-3 rounded-2xl bg-foreground px-4 py-2.5 text-background shadow-elegant transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elegant-lg"
            >
              <AndroidMark className="size-7 shrink-0 text-[#3DDC84] transition-transform duration-300 group-hover:scale-110" />
              <span className="flex flex-col text-start leading-tight">
                <span className="text-[10px] font-medium text-background/70">
                  {l("حمّل تطبيق Med Aura", "Download Med Aura")}
                </span>
                <span className="text-sm font-bold">{l("لأجهزة أندرويد", "for Android")}</span>
              </span>
              <Download className="size-4 shrink-0 text-background/60 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </div>

          <FooterCol
            locale={locale}
            title={l("المنصة", "Platform")}
            links={[
              { href: "/doctors", label: l("ابحث عن طبيب", "Find a doctor") },
              { href: "/procedures", label: l("الإجراءات", "Procedures") },
              { href: "/centers", label: l("المراكز", "Centers") },
              { href: "/destinations", label: l("الوجهات", "Destinations") },
              { href: "/before-after", label: l("قبل وبعد", "Before & after") },
              { href: "/online-consultation", label: l("الاستشارة أونلاين", "Online consultation") },
              { href: "/trust-and-safety", label: l("الثقة والأمان", "Trust & safety") },
            ]}
          />
          <FooterCol
            locale={locale}
            title={l("الشركة", "Company")}
            links={[
              { href: "/about", label: l("من نحن", "About us") },
              { href: "/contact", label: l("تواصل معنا", "Contact") },
              { href: "/faq", label: l("الأسئلة الشائعة", "FAQ") },
              { href: "/for-doctors", label: l("انضم كطبيب", "Join as a doctor") },
              { href: "/for-centers/apply", label: l("سجّل مركزك", "Register your center") },
            ]}
          />
          <FooterCol
            locale={locale}
            title={l("قانوني", "Legal")}
            links={[
              { href: "/privacy", label: l("سياسة الخصوصية", "Privacy policy") },
              { href: "/terms", label: l("الشروط والأحكام", "Terms & conditions") },
              { href: "/refund-policy", label: l("سياسة الاسترجاع", "Refund policy") },
              { href: "/review-policy", label: l("سياسة التقييمات", "Review policy") },
              { href: "/medical-disclaimer", label: l("إخلاء المسؤولية الطبية", "Medical disclaimer") },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>© {year} Med Aura. {l("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
  locale,
}: {
  title: string
  links: { href: string; label: string }[]
  locale: Locale
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-primary/80">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={localizedPath(link.href, locale)}
              className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="h-px w-0 bg-primary transition-all duration-200 group-hover:w-3" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
