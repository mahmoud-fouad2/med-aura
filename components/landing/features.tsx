import { Search, FileLock2, Video, ClipboardList, CalendarCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Dictionary } from "@/lib/i18n"

const steps: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Search, title: "اختر الإجراء والطبيب", desc: "تصفّح إجراءات التجميل وقارن بين أطباء ومراكز معتمدين." },
  { icon: FileLock2, title: "شارك حالتك بأمان", desc: "أنشئ حالتك وارفع صورك وتقاريرك في مساحة خاصة محمية." },
  { icon: Video, title: "استشر طبيبًا", desc: "احجز استشارة فيديو أو حضورية بعد منح إذن الاطلاع." },
  { icon: ClipboardList, title: "استلم الخطة والسعر", desc: "احصل على خطة علاجية وعرض سعر واضح قبل القرار." },
  { icon: CalendarCheck, title: "أكمل الحجز والمتابعة", desc: "ثبّت موعد الإجراء وتابع تعافيك خطوة بخطوة." },
]

export function Features({ t }: { t: Dictionary["home"] }) {
  return (
    <section id="how-it-works" className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="رحلة واضحة"
          title={t.howItWorks}
          subtitle="خمس خطوات مدروسة من البحث حتى المتابعة بعد الإجراء، بثقة ووضوح."
        />

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <StaggerItem key={step.title} className="relative">
              {i < steps.length - 1 && (
                <span
                  className="absolute top-9 left-0 hidden h-px w-full -translate-x-1/2 bg-gradient-to-l from-primary/30 to-transparent lg:block"
                  aria-hidden
                />
              )}
              <div className="relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.4_0.15_300)] text-primary-foreground shadow-elegant">
                  <step.icon className="size-6" />
                </span>
                <div>
                  <span className="font-heading text-sm font-bold text-primary/70">
                    {`٠${i + 1}`}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
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
