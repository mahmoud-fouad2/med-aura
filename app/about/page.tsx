import { ShieldCheck, HeartHandshake, Sparkles, Globe, Lock, Stethoscope } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { SectionHeading } from "@/components/ui/section-heading"
import { Reveal } from "@/components/motion"
import { getI18n } from "@/lib/i18n"

export const metadata = {
  title: "من نحن",
  description:
    "Med Aura منصة متخصصة في التجميل الطبي تربط المرضى بأطباء ومراكز معتمدة وتدير الرحلة التجميلية بثقة وأمان.",
}

export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const { locale } = await getI18n()
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
  const values = [
    { icon: ShieldCheck, title: l("نخبة معتمدة وتراخيص موثّقة", "Certified Experts & Verified Licenses"), desc: l("نلتزم بأعلى المعايير الطبية؛ فلا ينضم إلينا إلا أطباء ومراكز استوفت الفحص المهني الدقيق والتراخيص السارية.", "A doctor can appear publicly only with an approved profile and a valid, unexpired license.") },
    { icon: Lock, title: l("خصوصية مطلقة وأمان لبياناتك", "Absolute Privacy & Data Protection"), desc: l("ملفاتكِ وصوركِ الطبية مشفرة بالكامل، ولا يطلع عليها أي طبيب إلا بعد موافقتكِ الصريحة، مع إمكانية إلغاء الإذن في أي لحظة.", "A doctor can view your case files only after you grant access, and you can withdraw it.") },
    { icon: Sparkles, title: l("خطة علاجية مخصصة وتكلفة واضحة", "Clear Treatment Plan & Pricing"), desc: l("تحصلين على تصور طبي متكامل يشمل خطوات الإجراء، النتائج المتوقعة، والتكلفة الدقيقة بكل شفافية.", "Keep consultation, planning, pricing, and booking together.") },
    { icon: HeartHandshake, title: l("رعاية مستمرة ومتابعة بعد الإجراء", "Connected Aftercare & Support"), desc: l("نرافقكِ خطوة بخطوة أثناء فترة التعافي مع إرشادات دورية وتواصل مباشر مع فريق الرعاية.", "Follow-up tasks and communication remain connected to your case.") },
    { icon: Globe, title: l("أرقى الوجهات التجميلية العالمية", "Top Global Medical Destinations"), desc: l("استكشفي نخبة المراكز التجميلية في المملكة والخليج وتركيا مع مقارنة شفافة للخيارات والأسعار.", "Compare locations, languages, and currencies as offered by each provider.") },
    { icon: Stethoscope, title: l("تجربة مصممة لراحتكِ التامة", "Crafted for Aesthetic Excellence"), desc: l("صممنا كل تفصيلة في المنصة لتمنحكِ راحة البال والثقة في كل مرحلة من رحلتكِ الجمالية.", "Information and booking journeys are designed around aesthetic care decisions.") },
  ]
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("عن Med Aura", "About Med Aura")}
          title={l("رحلتكِ نحو الجمال بأعلى معايير الثقة والأمان", "A clearer aesthetic care journey")}
          subtitle={l("نرافقكِ في اختيار أفضل أطباء ومراكز التجميل المعتمدة، مع استشارات مرئية مريحة وخصوصية تامة لملفاتكِ الطبية.", "Compare providers, share your case privately, and keep consultation and aftercare steps in one place.")}
          primary={{ href: "/search", label: l("استكشفي الأطباء", "Find a doctor") }}
          secondary={{ href: "/how-it-works", label: l("كيف نرافقكِ", "How it works") }}
        />

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
            <Reveal>
              <div className="text-center space-y-6">
                <span className="text-gold font-bold tracking-widest text-sm uppercase">
                  {l("قصتنا", "Our Story")}
                </span>
                <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {l("لأن قراركِ الجمالي يستحق أعلى درجات العناية والوضوح", "Because better decisions need comparable information")}
                </h2>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {l(
                    "بدأت فكرة Med Aura من حاجة حقيقية لاحظناها في قطاع التجميل: صعوبة العثور على معلومات موثوقة، تشتت المريض بين عيادات متعددة، وانعدام الخصوصية عند مشاركة الصور الطبية. صممنا هذه المنصة لتكون الملاذ الآمن الذي يجمع لكِ نخبة الأطباء المعتمدين في مكان واحد، لتتمكني من المقارنة، الاستشارة المرئية، التخطيط الطبي الدقيق، والرعاية اللاحقة في تجربة واحدة راقية ومطمئنة.",
                    "Med Aura started from a real need in the aesthetic sector: the difficulty of finding reliable information, patient fragmentation across clinics, and lack of privacy when sharing medical photos. We designed this platform to be a safe haven that brings together top certified doctors in one place."
                  )}
                </p>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              <Reveal delay={0.1}>
                <div className="rounded-3xl bg-secondary/40 p-8 border border-border/60 h-full">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-4">{l("رؤيتنا", "Our Vision")}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {l(
                      "أن نكون الوجهة الرقمية الأولى والأكثر ثقة للرعاية التجميلية في الشرق الأوسط والعالم، حيث ترتبط التكنولوجيا المتطورة بالرعاية الإنسانية الفائقة لتمكين كل فرد من اتخاذ قرارات تجميلية واثقة.",
                      "To be the first and most trusted digital destination for aesthetic care in the Middle East and the world."
                    )}
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="rounded-3xl bg-secondary/40 p-8 border border-border/60 h-full">
                  <div className="size-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-6">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-4">{l("رسالتنا", "Our Mission")}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {l(
                      "الارتقاء بتجربة التجميل من خلال الشفافية المطلقة، حماية الخصوصية، وتوفير أدوات ذكية تسهل التواصل الفعال بين المرضى وأفضل الكفاءات الطبية عالمياً.",
                      "Elevating the aesthetic experience through absolute transparency, privacy protection, and providing smart tools."
                    )}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
              {[
                { label: l("أطباء معتمدين", "Certified Doctors"), value: "+50" },
                { label: l("مركز طبي", "Medical Centers"), value: "+20" },
                { label: l("استشارة ناجحة", "Consultations"), value: "+10k" },
                { label: l("دولة حول العالم", "Countries"), value: "15" },
              ].map((stat, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="flex flex-col gap-2">
                    <span className="font-heading text-4xl font-bold text-white sm:text-5xl">{stat.value}</span>
                    <span className="text-sm font-medium text-primary-foreground/80">{stat.label}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <SectionHeading eyebrow={l("قيمنا الأساسية", "Our principles")} title={l("ما الذي يوجّه عملنا", "What guides the product")} subtitle={l("نلتزم بمعايير لا مساومة فيها لضمان تجربة مثالية.", "We adhere to uncompromising standards.")} />
            <div className="mt-16">
              <FeatureGrid items={values} />
            </div>
          </div>
        </section>

        <section className="bg-secondary/30 border-b border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gold/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8 relative z-10">
            <Reveal>
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
                {l("هل أنتِ مستعدة لبدء رحلتكِ؟", "Ready to start your journey?")}
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                {l("انضمي إلى الآلاف ممن وثقوا في منصتنا لاختيار الأفضل لجمالهم وصحتهم.", "Join thousands who trusted our platform to choose the best for their beauty and health.")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/search" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                  {l("ابحثي عن طبيبكِ الآن", "Find your doctor now")}
                </a>
                <a href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-secondary/80">
                  {l("إنشاء حساب مجاني", "Create free account")}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
