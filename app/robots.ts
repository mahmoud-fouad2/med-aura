import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/env"

export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "")
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/403"],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
