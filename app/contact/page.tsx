import { Mail, MessageSquare, ShieldCheck } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { ContactForm } from "@/components/marketing/contact-form"
import { Card } from "@/components/ui/card"
import { getI18n } from "@/lib/i18n"

export const metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق Med Aura لأي استفسار عن المنصة أو الخدمات أو الشراكات.",
}

export const dynamic = "force-dynamic"

export default async function ContactPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("خدمة العملاء والشراكات", "Contact")}
          title={l("فريقنا دائماً في خدمتكِ ومساعدتكِ", "How can we help?")}
          subtitle={l("يسعدنا تلقي استفساراتكِ ومساعدتكِ في كل ما يخص استشاراتكِ الطبية أو انضمام الأطباء والمراكز التجميلية المعتمدة.", "Send us a message about the platform, support, privacy, or provider partnerships.")}
        />

        <section className="bg-background">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
            <div className="space-y-4">
              <InfoCard
                icon={MessageSquare}
                title={l("الدعم ورعاية المراجعين", "Support and questions")}
                desc={l("فريقنا جاهز للإجابة عن تساؤلاتكِ ومساعدتكِ في اختيار الطبيب وإتمام الاستشارة.", "Our team can help with using the platform and booking consultations.")}
              />
              <InfoCard
                icon={ShieldCheck}
                title={l("انضمام الأطباء والمراكز", "Partnerships and credentialing")}
                desc={l("هل أنت طبيب أو ممثل مركز تجميل ترغب بالانضمام؟ تواصل معنا لبدء إجراءات الاعتماد المهني.", "Doctors and centers can contact us to begin the credential review process.")}
              />
              <InfoCard
                icon={Mail}
                title={l("الخصوصية وحماية البيانات", "Privacy and data")}
                desc={l("لأي استفسارات تتعلق بحماية بياناتكِ وملفاتكِ الطبية، نتعامل مع طلبكِ بأعلى سرية.", "Contact us for data access or deletion requests, handled privately.")}
              />
            </div>
            <ContactForm locale={locale} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <Card className="flex gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-elegant">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
        <Icon className="size-6" />
      </span>
      <div>
        <h3 className="font-heading font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </Card>
  )
}
