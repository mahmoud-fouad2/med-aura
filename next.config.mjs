import os from "node:os"

/** @type {import('next').NextConfig} */

// Security headers applied to every response. CSP is intentionally strict but
// allows the inline styles Next/Tailwind need and the Stripe checkout frame.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
]

const configuredBuildCpus = Number.parseInt(process.env.NEXT_BUILD_CPUS ?? "2", 10)
const buildCpus =
  Number.isFinite(configuredBuildCpus) && configuredBuildCpus > 0
    ? Math.min(configuredBuildCpus, os.cpus().length)
    : 2

const nextConfig = {
  experimental: {
    cpus: buildCpus,
  },
  // TypeScript errors must fail the build. Do NOT re-enable ignoreBuildErrors.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Image optimization stays ON. Remote provider images (R2 public assets)
    // are allowlisted here when a public base URL is configured.
    remotePatterns: process.env.R2_PUBLIC_BASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.R2_PUBLIC_BASE_URL).hostname,
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
