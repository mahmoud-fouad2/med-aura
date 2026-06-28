import Link from "next/link"
import {
  HeartPulse,
  Smile,
  Eye,
  Bone,
  Sparkles,
  Baby,
  Brain,
  Scissors,
} from "lucide-react"

const specialties = [
  { icon: Smile, label: "طب الأسنان", slug: "dentistry" },
  { icon: Sparkles, label: "التجميل", slug: "cosmetic" },
  { icon: HeartPulse, label: "القلب", slug: "cardiology" },
  { icon: Bone, label: "العظام", slug: "orthopedics" },
  { icon: Eye, label: "العيون", slug: "ophthalmology" },
  { icon: Scissors, label: "زراعة الشعر", slug: "hair-transplant" },
  { icon: Baby, label: "الخصوبة", slug: "fertility" },
  { icon: Brain, label: "الأعصاب", slug: "neurology" },
]

export function Specialties() {
  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            تصفّح حسب التخصص
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            اختر التخصص الذي تبحث عنه واكتشف أفضل الأطباء والمراكز المتخصصة.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {specialties.map((s) => (
            <Link
              key={s.slug}
              href={`/search?specialty=${s.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-7 w-7" />
              </span>
              <span className="font-medium text-foreground">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
