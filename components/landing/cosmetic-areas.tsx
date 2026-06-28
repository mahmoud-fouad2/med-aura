import Link from "next/link"
import type { Dictionary } from "@/lib/i18n"

/**
 * Quick navigation into the database-backed search by cosmetic area. These are
 * navigation entry points only — the actual catalog lives in the DB and is
 * managed by admins. Cosmetic-only: no general medical specialties.
 */
const areas = [
  { slug: "face-neck", label: "الوجه والرقبة", emoji: "🪞" },
  { slug: "rhinoplasty", label: "الأنف", emoji: "👃", asQuery: true },
  { slug: "breast", label: "الثدي", emoji: "🎀" },
  { slug: "body", label: "البطن والجسم", emoji: "💪" },
  { slug: "skin", label: "البشرة", emoji: "✨" },
  { slug: "hair", label: "الشعر", emoji: "💇" },
]

export function CosmeticAreas({ t }: { t: Dictionary["home"] }) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-balance text-center font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t.exploreByArea}
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {areas.map((a) => (
            <Link
              key={a.slug}
              href={
                a.asQuery
                  ? `/search?q=${encodeURIComponent("تجميل الأنف")}`
                  : `/search?category=${a.slug}`
              }
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>
                {a.emoji}
              </span>
              <span className="font-medium text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
