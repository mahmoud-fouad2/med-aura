import Link from "next/link"
import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react"
import { Logo } from "@/components/brand/logo"

export function SiteFooter() {
  const year = new Date().getFullYear()

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
            <Link href="/" aria-label="Med Aura" className="w-fit">
              <Logo />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              منصة تساعدك على اختيار طبيب أو مركز تجميل بثقة، ومتابعة رحلتك
              من أول استشارة حتى الاطمئنان بعد الإجراء.
            </p>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                أطباء ومراكز يتم قبولهم بعناية
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4 text-gold" />
                تجربة واضحة من البحث حتى الحجز
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake className="size-4 text-primary" />
                دعم إنساني عندما تحتاج المساعدة
              </span>
            </div>
          </div>

          <FooterCol
            title="المنصة"
            links={[
              { href: "/doctors", label: "ابحث عن طبيب" },
              { href: "/procedures", label: "الإجراءات" },
              { href: "/centers", label: "المراكز" },
              { href: "/destinations", label: "الوجهات" },
              { href: "/before-after", label: "قبل وبعد" },
              { href: "/online-consultation", label: "الاستشارة أونلاين" },
              { href: "/trust-and-safety", label: "الثقة والأمان" },
            ]}
          />
          <FooterCol
            title="الشركة"
            links={[
              { href: "/about", label: "من نحن" },
              { href: "/contact", label: "تواصل معنا" },
              { href: "/faq", label: "الأسئلة الشائعة" },
              { href: "/for-doctors", label: "انضم كطبيب" },
              { href: "/for-centers/apply", label: "سجّل مركزك" },
            ]}
          />
          <FooterCol
            title="قانوني"
            links={[
              { href: "/privacy", label: "سياسة الخصوصية" },
              { href: "/terms", label: "الشروط والأحكام" },
              { href: "/refund-policy", label: "سياسة الاسترجاع" },
              { href: "/review-policy", label: "سياسة التقييمات" },
              { href: "/medical-disclaimer", label: "إخلاء المسؤولية الطبية" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>© {year} Med Aura. جميع الحقوق محفوظة.</p>
          <p className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            رعاية أوضح وقرار أهدأ
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
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
              href={link.href}
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
