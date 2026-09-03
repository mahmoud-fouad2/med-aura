import {
  BadgeCheck,
  FileLock2,
  CreditCard,
  Star,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Locale } from "@/lib/i18n"

const pillars: { icon: LucideIcon; title: string; titleEn: string; desc: string; descEn: string }[] = [
  {
    icon: Star,
    title: "تقييمات مرتبطة بتجارب فعلية",
    titleEn: "Experience-based reviews",
    desc: "نربط التقييمات المؤهلة بتجربة موثقة على المنصة لتقديم سياق أوضح عند المقارنة.",
    descEn: "Eligible reviews are linked to a recorded platform experience to make comparison more useful.",
  },
  {
    icon: CreditCard,
    title: "مدفوعات آمنة ومحمية",
    titleEn: "Secure payments",
    desc: "تظهر الرسوم المتاحة بوضوح قبل التأكيد، وتتم معالجة الدفع عبر مزوّد الدفع عند تفعيل الخدمة.",
    descEn: "Available fees are shown before confirmation, with payments handled by the configured payment provider.",
  },
  {
    icon: FileLock2,
    title: "خصوصية مشاركة الملفات",
    titleEn: "Private files",
    desc: "تُشارك الصور والتقارير ضمن رحلة الرعاية ومع الأطراف المخوّلة فقط، وفق إعدادات الحساب والموافقة.",
    descEn: "Your photos and reports stay private and are shared only for your care.",
  },
  {
    icon: BadgeCheck,
    title: "مراجعة البيانات المهنية",
    titleEn: "License checks",
    desc: "نراجع بيانات الترخيص والمؤهلات المقدمة قبل نشر ملف الطبيب أو المركز على المنصة.",
    descEn: "Provider credentials are reviewed before profiles are published.",
  },
]

export function TrustBand({ locale }: { locale: Locale }) {
  const isAr = locale === "ar"
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          align="start"
          eyebrow={isAr ? "الثقة والأمان" : "Trust & safety"}
          title={isAr ? "ثقة مبنية على خطوات واضحة" : "Trust built on clear steps"}
          subtitle={isAr ? "معلومات قابلة للمراجعة، مشاركة خاصة، وخطوات مفهومة من البحث حتى المتابعة." : "Reviewable information, private sharing, and understandable steps from search to follow-up."}
        />
        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <div className="group relative isolate flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold/14 ring-1 ring-gold/25 transition-transform duration-300 group-hover:scale-105">
                  <p.icon className="size-7 text-gold" />
                </span>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {isAr ? p.title : p.titleEn}
                  </h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {isAr ? p.desc : p.descEn}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
