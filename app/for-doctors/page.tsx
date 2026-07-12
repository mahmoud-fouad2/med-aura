import { Users, CalendarCheck, ShieldCheck, Wallet, LineChart, FileCheck2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

export const metadata = {
  title: "انضم كطبيب",
  description:
    "انضم إلى Med Aura كطبيب تجميل معتمد، واعرض خدماتك أمام مرضى موثوقين، وأدِر استشاراتك وحالاتك بكفاءة.",
}

const benefits = [
  { icon: Users, title: "مرضى موثوقون", desc: "تواصل مع مرضى جادّين يبحثون عن رعاية تجميلية معتمدة." },
  { icon: CalendarCheck, title: "إدارة المواعيد", desc: "نظّم جدولك ومواعيدك واستشاراتك في مكان واحد." },
  { icon: FileCheck2, title: "حالات منظّمة", desc: "استقبل حالات تتضمن الصور والتقارير، باطّلاع مصرّح به فقط." },
  { icon: ShieldCheck, title: "هوية موثّقة", desc: "شارة توثيق تعزّز ثقة المرضى بعد التحقق من ترخيصك." },
  { icon: Wallet, title: "مدفوعات منظّمة", desc: "رسوم استشارة وعرابين عبر بوابة دفع آمنة وواضحة." },
  { icon: LineChart, title: "حضور احترافي", desc: "ملف مهني راقٍ يبرز خبرتك وإجراءاتك وتقييماتك الموثقة." },
]

const steps = [
  "أنشئ حسابًا على المنصة.",
  "قدّم طلب الانضمام من لوحة التحكم مع بياناتك المهنية وترخيصك.",
  "يراجع فريق الاعتماد طلبك ويتحقق من ترخيصك.",
  "بعد الموافقة يُنشر ملفك وتبدأ في استقبال الاستشارات.",
]

export const dynamic = "force-dynamic"

export default function ForDoctorsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="لمقدّمي الخدمة"
          title="انضم إلى Med Aura كطبيب تجميل"
          subtitle="اعرض خبرتك أمام مرضى يبحثون عن رعاية موثوقة، وأدِر رحلتهم من الاستشارة حتى المتابعة — بعد التحقق من ترخيصك."
          primary={{ href: "/sign-up?type=doctor", label: "ابدأ طلب الانضمام" }}
          secondary={{ href: "/how-it-works", label: "كيف تعمل المنصة" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="المزايا" title="لماذا تنضم إلينا" />
            <div className="mt-12">
              <FeatureGrid items={benefits} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="الانضمام" title="خطوات بسيطة للبدء" align="start" />
            <Stagger className="mt-10 space-y-4">
              {steps.map((s, i) => (
                <StaggerItem key={i}>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-foreground">{s}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
