import os from "node:os"

/** @type {import('next').NextConfig} */

const r2ImageOrigin = (() => {
  try {
    return process.env.R2_PUBLIC_BASE_URL
      ? new URL(process.env.R2_PUBLIC_BASE_URL.trim()).origin
      : null
  } catch {
    return null
  }
})()

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: https://images.unsplash.com${r2ImageOrigin ? ` ${r2ImageOrigin}` : ""}`,
  "connect-src 'self' https://www.google.com https://www.gstatic.com https://*.pusher.com https://sockjs.pusher.com wss://*.pusher.com https://*.daily.co wss://*.daily.co https://*.daily-cloud.net wss://*.daily-cloud.net",
  "frame-src 'self' https://www.google.com https://recaptcha.google.com https://*.daily.co",
  "media-src 'self' blob: https://*.daily.co https://*.daily-cloud.net",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ")

// Security headers applied to every response. CSP is enabled in production;
// development keeps Turbopack's eval-based HMR available.
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
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
]

const configuredBuildCpus = Number.parseInt(process.env.NEXT_BUILD_CPUS ?? "2", 10)
const buildCpus =
  Number.isFinite(configuredBuildCpus) && configuredBuildCpus > 0
    ? Math.min(configuredBuildCpus, os.cpus().length)
    : 2

const nextConfig = {
  poweredByHeader: false,
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
    // `search` is matched EXACTLY by Next (see match-local-pattern.js), so
    // pinning a literal "?v=<date>" here breaks every image the moment
    // SERVICE_IMAGE_VERSION in lib/seo.ts is bumped — which is exactly how
    // the whole service-image set started 400-ing. Omitting `search`
    // entirely allows any query string for these two public asset folders,
    // so cache-busting versions can be rolled forward freely. The paths are
    // still allowlisted, and the query never changes which file is read.
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/destinations/**" },
      { pathname: "/demo-services/**" },
      { pathname: "/service-images/**" },
    ],
    // Image optimization stays ON. Remote provider images (R2 public assets,
    // Unsplash stock photography used by the static blog posts) are
    // allowlisted here.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.R2_PUBLIC_BASE_URL
        ? [
            {
              protocol: "https",
              hostname: new URL(process.env.R2_PUBLIC_BASE_URL).hostname,
            },
          ]
        : []),
    ],
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
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
