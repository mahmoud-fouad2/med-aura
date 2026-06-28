import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, ShieldCheck, Star } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            أطباء ومراكز معتمدة وموثوقة
          </span>
          <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
            رحلتك العلاجية تبدأ بثقة مع{" "}
            <span className="text-primary">MED AURA</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            ابحث وقارن بين أفضل الأطباء والمراكز الطبية حول العالم، اطّلع على
            الأسعار والتقييمات، واحجز استشارتك خلال دقائق — كل ذلك في مكان واحد.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/search">
                <Search className="h-5 w-5" />
                ابحث عن علاجك الآن
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/centers">تصفّح المراكز الطبية</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-2">
            <Stat value="+٥٠٠" label="طبيب معتمد" />
            <Stat value="+١٢٠" label="مركز طبي" />
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">٤.٩ من ٥</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-border shadow-xl">
            <Image
              src="/hero-clinic.png"
              alt="طبيبة تستشير مريضًا في عيادة حديثة"
              width={720}
              height={560}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-6 hidden items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">تحقّق من الاعتمادات</p>
              <p className="text-xs text-muted-foreground">كل مركز موثّق يدويًا</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-heading text-2xl font-bold text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
