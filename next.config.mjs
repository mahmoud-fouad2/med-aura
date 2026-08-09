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
  // Standalone mode traces only the dependencies each route actually uses
  // into .next/standalone, instead of `next start` loading the full
  // framework + the entire node_modules tree into memory. This is Next's
  // own recommended setting for memory-constrained container deployments
  // (Render, Docker, etc.) — a meaningfully smaller baseline footprint,
  // not a traffic-dependent optimization like the image-variant trimming.
  // Requires scripts/prepare-standalone.mjs (postbuild) to copy public/,
  // .next/static/, and drizzle/ into the traced output — none of those are
  // reachable via static import, so the tracer can't find them on its own.
  output: "standalone",
  experimental: {
    cpus: buildCpus,
  },
  // TypeScript errors must fail the build. Do NOT re-enable ignoreBuildErrors.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/demo-services/**", search: "?v=20260809" },
    ],
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
    // Next's defaults (8 deviceSizes x 8 imageSizes = up to 64 distinct
    // sharp-transform variants per unique source image) are real memory/CPU
    // pressure on a small instance — this is the leading suspect for the
    // Render "exceeded memory limit" auto-restarts, timed right after real
    // doctor/procedure photos started flowing through the optimizer. Trimmed
    // to the breakpoints this app's own `sizes` props actually use (verified
    // via grep across components/ and app/) plus one 2x/hero tier — real
    // reduction in transform variants, not a guess.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    // Doctor/procedure photos rarely change once set — cache the optimized
    // result for a week instead of re-transforming on every cold cache miss.
    minimumCacheTTL: 604800,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ]
  },
}

export default nextConfig
