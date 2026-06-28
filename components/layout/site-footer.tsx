import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Link href="/">
              <Logo />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              منصة متخصصة في التجميل الطبي تدير رحلتك من الاستشارة حتى المتابعة
              بأمان وموثوقية.
            </p>
          </div>

          <FooterCol
            title="المنصة"
            links={[
              { href: "/search", label: "ابحث عن طبيب" },
              { href: "/how-it-works", label: "كيف تعمل المنصة" },
              { href: "/sign-up", label: "انضم كمقدّم خدمة" },
            ]}
          />
          <FooterCol
            title="حسابك"
            links={[
              { href: "/sign-in", label: "تسجيل الدخول" },
              { href: "/sign-up", label: "إنشاء حساب" },
              { href: "/dashboard", label: "لوحة التحكم" },
            ]}
          />
          <FooterCol
            title="قانوني"
            links={[
              { href: "/privacy", label: "سياسة الخصوصية" },
              { href: "/terms", label: "الشروط والأحكام" },
              { href: "/medical-disclaimer", label: "إخلاء المسؤولية الطبية" },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Med Aura. جميع الحقوق محفوظة.
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
      <h3 className="font-heading font-semibold text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
