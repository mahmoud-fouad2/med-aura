import type { MetadataRoute } from "next"
import { eq, and } from "drizzle-orm"
import { appUrl } from "@/lib/env"
import { db, isDbConfigured } from "@/lib/db"
import { doctorProfile, center, procedure } from "@/lib/db/schema"

/** Public, published entity URLs — never listed for anything unpublished/unapproved/hidden. */
async function entityRoutes(): Promise<{ path: string; lastModified: Date }[]> {
  if (!isDbConfigured) return []
  const [doctors, centers, procedures] = await Promise.all([
    db
      .select({ slug: doctorProfile.slug, updatedAt: doctorProfile.updatedAt })
      .from(doctorProfile)
      .where(and(eq(doctorProfile.published, true), eq(doctorProfile.status, "approved"))),
    db
      .select({ slug: center.slug, updatedAt: center.updatedAt })
      .from(center)
      .where(and(eq(center.published, true), eq(center.status, "approved"))),
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
  const staticEntries: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }))

  const dynamic = await entityRoutes().catch(() => [])
  const dynamicEntries: MetadataRoute.Sitemap = dynamic.map(({ path, lastModified }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  return [...staticEntries, ...dynamicEntries]
}
