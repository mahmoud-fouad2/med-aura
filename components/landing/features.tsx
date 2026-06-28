import { Search, FileLock2, Video, ClipboardList, CalendarCheck } from "lucide-react"
import type { Dictionary } from "@/lib/i18n"

const steps = [
  { icon: Search, title: "اختر الإجراء والطبيب", desc: "تصفّح إجراءات التجميل وقارن بين أطباء ومراكز معتمدين." },
  { icon: FileLock2, title: "شارك حالتك بأمان", desc: "أنشئ حالتك وارفع صورك وتقاريرك في مساحة خاصة ومحمية." },
  { icon: Video, title: "استشر طبيبًا", desc: "احجز استشارة فيديو أو حضورية بعد منح الطبيب صلاحية الاطلاع." },
  { icon: ClipboardList, title: "استلم الخطة والسعر", desc: "احصل على خطة علاجية وعرض سعر واضح قبل اتخاذ القرار." },
  { icon: CalendarCheck, title: "أكمل الحجز والمتابعة", desc: "ثبّت موعد الإجراء وتابع تعافيك خطوة بخطوة بعد العملية." },
]

export function Features({ t }: { t: Dictionary["home"] }) {
  return (
    <section id="how-it-works" className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t.howItWorks}
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-6" />
              </span>
              <div>
                <span className="text-sm font-semibold text-primary/70">
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
          ))}
        </div>
      </div>
    </section>
  )
}
