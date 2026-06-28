import Link from "next/link"
import {
  Smile,
  ScanFace,
  Ribbon,
  PersonStanding,
  Sparkles,
  Scissors,
  ArrowLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Dictionary } from "@/lib/i18n"

type Area = { slug: string; label: string; icon: LucideIcon; asQuery?: boolean }

const areas: Area[] = [
  { slug: "face-neck", label: "الوجه والرقبة", icon: Smile },
  { slug: "rhinoplasty", label: "تجميل الأنف", icon: ScanFace, asQuery: true },
  { slug: "breast", label: "الثدي", icon: Ribbon },
  { slug: "body", label: "البطن والجسم", icon: PersonStanding },
  { slug: "skin", label: "البشرة", icon: Sparkles },
  { slug: "hair", label: "الشعر", icon: Scissors },
]

export function CosmeticAreas({ t }: { t: Dictionary["home"] }) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="اكتشف حسب المنطقة"
          title={t.exploreByArea}
          subtitle="اختر المنطقة التي تهتم بها وتصفّح الأطباء والإجراءات المتخصصة."
        />
        <Stagger className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {areas.map((a) => (
            <StaggerItem key={a.slug}>
              <Link
                href={
                  a.asQuery
                    ? `/search?q=${encodeURIComponent("تجميل الأنف")}`
                    : `/search?category=${a.slug}`
                }
                className="group flex h-full flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
              >
                <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-accent text-primary transition-transform duration-300 group-hover:scale-105">
                  <a.icon className="size-7" />
                </span>
                <span className="font-heading font-semibold text-foreground">
                  {a.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  استكشف
                  <ArrowLeft className="size-3.5" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
