import type { MetadataRoute } from "next"
import { eq, and } from "drizzle-orm"
import { appUrl } from "@/lib/env"
import { db, isDbConfigured } from "@/lib/db"
import { center, doctorProfile, procedure } from "@/lib/db/schema"
import { publicCenterConditions, publicDoctorConditions } from "@/lib/data/public-visibility"

/** Public, published entity URLs — never listed for anything unpublished/unapproved/hidden. */
async function entityRoutes(): Promise<{ path: string; lastModified: Date }[]> {
  if (!isDbConfigured) return []
  const [doctors, centers, procedures] = await Promise.all([
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
  ])
  return [
    ...doctors.map((d) => ({ path: `/doctors/${d.slug}`, lastModified: d.updatedAt })),
    ...centers.map((c) => ({ path: `/centers/${c.slug}`, lastModified: c.updatedAt })),
    ...procedures.map((p) => ({ path: `/procedures/${p.slug}`, lastModified: p.updatedAt })),
  ]
}

/**
 * Static public routes plus every published doctor/center/procedure detail
 * page. Falls back to just the static routes when the DB isn't reachable
 * (isDbConfigured false) — a build must never hard-require a DB connection.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "")
  const routes = [
    "",
    "/doctors",
    "/search",
    "/procedures",
    "/centers",
    "/destinations",
    "/online-consultation",
    "/how-it-works",
    "/trust-and-safety",
    "/about",
    "/contact",
    "/faq",
    "/for-doctors",
    "/for-centers",
    "/privacy",
    "/terms",
    "/refund-policy",
    "/review-policy",
    "/medical-disclaimer",
    "/sign-in",
    "/sign-up",
  ]
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = routes.flatMap((path) =>
    (["ar", "en"] as const).map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: {
          ar: `${base}/ar${path}`,
          en: `${base}/en${path}`,
        },
      },
    })),
  )

  const dynamic = await entityRoutes().catch(() => [])
  const dynamicEntries: MetadataRoute.Sitemap = dynamic.flatMap(({ path, lastModified }) =>
    (["ar", "en"] as const).map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          ar: `${base}/ar${path}`,
          en: `${base}/en${path}`,
        },
      },
    })),
  )

  return [...staticEntries, ...dynamicEntries]
}
