import Link from "next/link"
import {
  Smile,
  Gem,
  PersonStanding,
  Sparkles,
  Scissors,
  SmilePlus,
  ArrowLeft,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/ui/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import type { Dictionary, Locale } from "@/lib/i18n"

type Area = { slug: string; label: string; labelEn: string; icon: LucideIcon }

const areas: Area[] = [
  { slug: "face-neck", label: "الوجه والرقبة", labelEn: "Face & Neck", icon: Smile },
  { slug: "breast", label: "الثدي", labelEn: "Breast", icon: Gem },
  { slug: "body", label: "الجسم", labelEn: "Body", icon: PersonStanding },
  { slug: "skin", label: "البشرة", labelEn: "Skin", icon: Sparkles },
  { slug: "hair", label: "الشعر", labelEn: "Hair", icon: Scissors },
  { slug: "dental", label: "الأسنان والابتسامة", labelEn: "Dental & Smile", icon: SmilePlus },
]

export function CosmeticAreas({ 
  t, 
  locale 
}: { 
  t: Dictionary["home"]
  locale: Locale
}) {
  const isAr = locale === "ar"

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isAr ? "اكتشف حسب المنطقة" : "Explore by Area"}
          title={t.exploreByArea}
          subtitle={isAr ? "اختر المنطقة التي تهتم بها وتصفّح الأطباء والإجراءات المتخصصة." : "Choose the area you are interested in and browse specialized doctors and procedures."}
        />
        <Stagger className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {areas.map((a) => (
            <StaggerItem key={a.slug}>
              <Link
                href={`/search?category=${a.slug}`}
                className="group flex h-full flex-col items-center gap-4 rounded-2xl border border-white/60 bg-card/85 p-6 text-center shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-elegant-lg backdrop-blur-sm"
              >
                <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-accent text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
                  <a.icon className="size-7" />
                </span>
                <span className="font-heading font-semibold text-foreground">
                  {isAr ? a.label : a.labelEn}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {isAr ? "استكشف" : "Explore"}
                  <ArrowLeft className="size-3.5 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
