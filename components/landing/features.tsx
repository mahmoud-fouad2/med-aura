import { Search, FileLock2, Video, ClipboardList, CalendarCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Dictionary, Locale } from "@/lib/i18n"

const stepsAr = [
  { icon: Search, title: "اختر الإجراء والطبيب", desc: "تصفّح إجراءات التجميل وقارن بين أطباء ومراكز معتمدين." },
  { icon: FileLock2, title: "شارك حالتك بأمان", desc: "أنشئ حالتك وارفع صورك وتقاريرك في مساحة خاصة محمية." },
  { icon: Video, title: "استشر طبيبًا", desc: "احجز استشارة فيديو أو حضورية بعد منح إذن الاطلاع." },
  { icon: ClipboardList, title: "استلم الخطة والسعر", desc: "احصل على خطة علاجية وعرض سعر واضح قبل القرار." },
  { icon: CalendarCheck, title: "أكمل الحجز والمتابعة", desc: "ثبّت موعد الإجراء وتابع تعافيك خطوة بخطوة." },
]

const stepsEn = [
  { icon: Search, title: "Choose Procedure & Doctor", desc: "Browse aesthetic procedures and compare accredited doctors and centers." },
  { icon: FileLock2, title: "Securely Share Your Case", desc: "Create your case and upload photos or reports in a private protected space." },
  { icon: Video, title: "Consult a Doctor", desc: "Book a video or in-person consultation after granting viewing permission." },
  { icon: ClipboardList, title: "Receive Plan & Quote", desc: "Get a clear treatment plan and pricing estimate before making any decision." },
  { icon: CalendarCheck, title: "Complete Booking & Follow-up", desc: "Confirm your procedure appointment and track your recovery step by step." },
]

export function Features({ 
  t, 
  locale 
}: { 
  t: Dictionary["home"]
  locale: Locale
}) {
  const isAr = locale === "ar"
  const steps = isAr ? stepsAr : stepsEn

  return (
    <section id="how-it-works" className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isAr ? "رحلة واضحة" : "A Clear Journey"}
          title={t.howItWorks}
          subtitle={isAr ? "خمس خطوات مدروسة من البحث حتى المتابعة بعد الإجراء، بثقة ووضوح." : "Five thoughtful steps from search to post-procedure follow-up, with confidence and clarity."}
        />

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 animate-in fade-in-50 duration-500">
          {steps.map((step, i) => (
            <StaggerItem key={step.title} className="relative">
              {i < steps.length - 1 && (
                <span
                  className="absolute top-9 hidden h-px w-full lg:block bg-gradient-to-l from-gold/50 to-transparent ltr:bg-gradient-to-r ltr:right-0 ltr:translate-x-1/2 rtl:left-0 rtl:-translate-x-1/2"
                  aria-hidden
                />
              )}
              <div className="relative flex h-full flex-col gap-4.5 rounded-2xl border border-white/60 bg-card/85 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/45 hover:shadow-elegant-lg backdrop-blur-sm">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gold-gradient text-white shadow-elegant ring-1 ring-gold/30 transition-transform duration-300 group-hover/feature:scale-105">
                  <step.icon className="size-6" />
                </span>
                <div>
                  <span className="font-heading text-sm font-bold" style={{ color: "oklch(0.52 0.1 85)" }}>
                    {`٠${i + 1}`}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground mt-1">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
