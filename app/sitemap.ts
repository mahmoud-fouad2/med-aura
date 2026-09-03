import type { MetadataRoute } from "next"
import { and, eq } from "drizzle-orm"
import { appUrl } from "@/lib/env"
import { db, isDbConfigured } from "@/lib/db"
import { center, doctorProfile, procedure } from "@/lib/db/schema"
import { publicCenterConditions, publicDoctorConditions } from "@/lib/data/public-visibility"
import { listDestinations } from "@/lib/data/destinations"
import { listPublishedArticles } from "@/lib/data/articles"

const CONTENT_UPDATED_AT = new Date("2026-09-01T00:00:00.000Z")

const PUBLIC_ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/doctors", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/procedures", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/centers", priority: 0.85, changeFrequency: "daily" as const },
  { path: "/destinations", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/online-consultation", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/before-after", priority: 0.75, changeFrequency: "weekly" as const },
  { path: "/advisor", priority: 0.75, changeFrequency: "monthly" as const },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/trust-and-safety", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/faq", priority: 0.65, changeFrequency: "monthly" as const },
  { path: "/for-doctors", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/for-centers", priority: 0.55, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/review-policy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/medical-disclaimer", priority: 0.3, changeFrequency: "yearly" as const },
]

async function entityRoutes(): Promise<{ path: string; lastModified: Date }[]> {
  if (!isDbConfigured) return []
  const [doctors, centers, procedures, destinations, { articles }] = await Promise.all([
    db
      .select({ slug: doctorProfile.slug, updatedAt: doctorProfile.updatedAt })
      .from(doctorProfile)
      .where(and(...publicDoctorConditions())),
    db
      .select({ slug: center.slug, updatedAt: center.updatedAt })
      .from(center)
      .where(and(...publicCenterConditions())),
    db
      .select({ slug: procedure.slug, updatedAt: procedure.updatedAt })
      .from(procedure)
      .where(eq(procedure.visible, true)),
    listDestinations(),
    listPublishedArticles({ limit: 1000 }),
  ])
  return [
    ...doctors.map((row) => ({ path: `/doctors/${row.slug}`, lastModified: row.updatedAt })),
    ...centers.map((row) => ({ path: `/centers/${row.slug}`, lastModified: row.updatedAt })),
    ...procedures.map((row) => ({ path: `/procedures/${row.slug}`, lastModified: row.updatedAt })),
    ...destinations
      .filter((row) => row.approvedDoctors + row.approvedCenters > 0)
      .map((row) => ({ path: `/destinations/${row.code.toLowerCase()}`, lastModified: CONTENT_UPDATED_AT })),
    ...articles.map((row) => ({ path: `/blog/${row.slug}`, lastModified: row.updatedAt })),
  ]
}

function localizedEntry(
  base: string,
  locale: "ar" | "en",
  path: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
): MetadataRoute.Sitemap[number] {
  return {
    url: `${base}/${locale}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ar: `${base}/ar${path}`,
        en: `${base}/en${path}`,
        "x-default": `${base}${path || "/"}`,
      },
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "")
  const staticEntries = PUBLIC_ROUTES.flatMap((route) =>
    (["ar", "en"] as const).map((locale) =>
      localizedEntry(
        base,
        locale,
        route.path,
        CONTENT_UPDATED_AT,
        route.priority,
        route.changeFrequency,
      ),
    ),
  )

  const dynamic = await entityRoutes().catch(() => [])
  const dynamicEntries = dynamic.flatMap(({ path, lastModified }) =>
    (["ar", "en"] as const).map((locale) =>
      localizedEntry(base, locale, path, lastModified, 0.7, "weekly"),
    ),
  )

  return [...staticEntries, ...dynamicEntries]
}
