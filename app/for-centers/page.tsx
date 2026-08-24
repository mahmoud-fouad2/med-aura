import { Building2, Users, CalendarRange, ShieldCheck, Wallet, ClipboardList } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"

export const metadata = {
  title: "سجّل مركزك",
  description:
    "سجّل مركز التجميل الخاص بك على Med Aura: أدِر فريقك وأطباءك ومواعيدك وحجوزاتك ضمن منصة موثوقة.",
}

const benefits = [
  { icon: Users, title: "إدارة متكاملة للفريق الطبي", desc: "أضف أطباء المركز والمنسقين وحدد الصلاحيات بدقة لإدارة العمليات اليومية بسلاسة." },
  { icon: CalendarRange, title: "جدولة ذكية للمواعيد والحجوزات", desc: "لوحة تحكم مركزية لمتابعة مواعيد الأطباء، غرف العمليات، وحجوزات الإجراءات التجميلية." },
  { icon: ClipboardList, title: "إدارة الحالات وعروض الأسعار", desc: "استقبل طلبات الحالات وأصدر خطط العلاج وعروض الأسعار التفصيلية بمرونة وشفافية." },
  { icon: ShieldCheck, title: "اعتماد منشأة وشارة موثّقة", desc: "توثيق رسمي للسجل التجاري والتراخيص الصحية يمنح مركزك مكانة بارزة وثقة مطلقة لدى المراجعين." },
  { icon: Wallet, title: "نظام مالي وفواتير إلكترونية", desc: "تتبع دقيق للمدفوعات، العرابين، الفواتير الإلكترونية، والتقارير المالية الشاملة." },
  { icon: Building2, title: "صفحة فاخرة تستعرض مرافقك", desc: "واجهة حصرية تعرض غرف العمليات، أحدث التقنيات التجميلية، ونخبة أطباء المركز." },
]

export const dynamic = "force-dynamic"

export default function ForCentersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="لمراكز التجميل"
          title="سجّل مركزك على Med Aura"
          subtitle="منصة متكاملة لإدارة أطبائك ومواعيدك وحالاتك وحجوزاتك، مع حضور موثوق أمام مرضى يبحثون عن رعاية تجميلية."
          primary={{ href: "/for-centers/apply", label: "سجّل مركزك" }}
          secondary={{ href: "/for-doctors", label: "أنت طبيب؟" }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="المزايا" title="أدوات تدير مركزك بكفاءة" />
            <div className="mt-12">
              <FeatureGrid items={benefits} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                eyebrow="الاعتماد"
                title="نتحقق قبل النشر"
                subtitle="نراجع السجل التجاري وترخيص المنشأة قبل تفعيل مركزك، حفاظًا على ثقة المرضى. تواصل معنا لبدء عملية التسجيل والاعتماد."
              />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
