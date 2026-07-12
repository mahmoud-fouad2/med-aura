import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/env"

/**
 * Static public routes. Dynamic entity URLs (procedures/doctors/centers) can be
 * appended from the DB later; kept static here so builds never require a DB.
 */
export default function sitemap(): MetadataRoute.Sitemap {
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
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }))
}
