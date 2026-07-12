import Link from "next/link"
import Image from "next/image"
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
import { serviceImageForCategory } from "@/lib/seo"

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
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-card/85 text-center shadow-elegant transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-elegant-lg backdrop-blur-sm"
              >
                <span className="relative block h-24 overflow-hidden bg-muted">
                  <Image
                    src={serviceImageForCategory(a.slug)}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                  <span className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-xl bg-white/92 text-primary ring-1 ring-white/60 shadow-elegant backdrop-blur">
                    <a.icon className="size-5" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col items-center gap-2 px-4 py-5">
                  <span className="font-heading text-sm font-semibold text-foreground sm:text-base">
                    {isAr ? a.label : a.labelEn}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    {isAr ? "استكشف" : "Explore"}
                    <ArrowLeft className="size-3.5 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
