import Link from "next/link"
import { Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaFooter() {
  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              هل أنت مركز طبي أو طبيب؟
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-primary-foreground/90 text-pretty">
              انضم إلى MED AURA واعرض خدماتك أمام آلاف المرضى الباحثين عن رعاية
              موثوقة حول العالم.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-up">سجّل كمقدّم خدمة</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <span className="font-heading text-xl font-extrabold text-foreground">
                  MED AURA
                </span>
              </Link>
              <p className="text-sm leading-relaxed text-muted-foreground">
                منصة السياحة العلاجية الموثوقة التي تربط المرضى بأفضل الأطباء
                والمراكز حول العالم.
              </p>
            </div>

            <FooterCol
              title="المنصة"
              links={[
                { href: "/search", label: "ابحث عن علاج" },
                { href: "/doctors", label: "الأطباء" },
                { href: "/centers", label: "المراكز" },
              ]}
            />
            <FooterCol
              title="الشركة"
              links={[
                { href: "/how-it-works", label: "كيف نعمل" },
                { href: "/sign-up", label: "انضم كمقدّم خدمة" },
              ]}
            />
            <FooterCol
              title="قانوني"
              links={[
                { href: "#", label: "سياسة الخصوصية" },
                { href: "#", label: "الشروط والأحكام" },
              ]}
            />
          </div>

          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MED AURA. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </>
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
