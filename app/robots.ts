import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "")
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api",
        "/403",
        "/complete-profile",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/ar/dashboard",
        "/en/dashboard",
        "/ar/admin",
        "/en/admin",
        "/ar/complete-profile",
        "/en/complete-profile",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
