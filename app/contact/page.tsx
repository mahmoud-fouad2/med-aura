import { Mail, MessageSquare, ShieldCheck } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { ContactForm } from "@/components/marketing/contact-form"
import { Card } from "@/components/ui/card"

export const metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق Med Aura لأي استفسار عن المنصة أو الخدمات أو الشراكات.",
}

export const dynamic = "force-dynamic"

export default function ContactPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="تواصل معنا"
          title="نسعد بخدمتك"
          subtitle="لأي استفسار عن المنصة أو الخدمات أو الشراكات، أرسل لنا رسالة وسيتواصل معك فريقنا."
        />

        <section className="bg-background">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
            <div className="space-y-4">
              <InfoCard
                icon={MessageSquare}
                title="الدعم والاستفسارات"
                desc="فريقنا جاهز للإجابة عن أسئلتك حول استخدام المنصة وحجز الاستشارات."
              />
              <InfoCard
                icon={ShieldCheck}
                title="الشراكات والاعتماد"
                desc="هل أنت مركز تجميل وترغب بالانضمام؟ راسلنا لبدء عملية التحقق والاعتماد."
              />
              <InfoCard
                icon={Mail}
                title="الخصوصية والبيانات"
                desc="لطلبات الوصول إلى بياناتك أو حذفها، تواصل معنا وسنتعامل مع طلبك بسرّية."
              />
            </div>
            <ContactForm />
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
    <Card className="flex gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="font-heading font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </Card>
  )
}
