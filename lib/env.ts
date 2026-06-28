import { z } from "zod"

/**
 * Centralised environment access for Med Aura.
 *
 * Design goals:
 *  - **Import-safe**: parsing never throws at module load, so `next build`
 *    works without secrets present. Missing-but-required values surface a clear
 *    error only when actually used at runtime (`requireEnv`).
 *  - **Honest integration flags**: `isStripeConfigured`, `isR2Configured`, etc.
 *    let the UI say "not configured" instead of faking success.
 *  - Startup validation lives in `instrumentation.ts` via {@link assertCoreEnv}.
 */

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Core
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_URL: z.url().optional(),
  APP_URL: z.url().optional(),
  // 32-byte (64 hex char) key for encrypting sensitive fields at rest.
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Cloudflare R2 / S3-compatible storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),

  // Stripe (payments, test mode)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Email (transactional)
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Video consultation provider (optional)
  VIDEO_PROVIDER_API_KEY: z.string().optional(),
  VIDEO_PROVIDER_API_SECRET: z.string().optional(),

  // reCAPTCHA
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

function read(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    // Should be rare since everything is optional; log and fall back to raw.
    console.error(
      "[env] invalid environment:",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    )
    cached = schema.parse({ NODE_ENV: process.env.NODE_ENV })
    return cached
  }
  cached = parsed.data
  return cached
}

export const env = new Proxy({} as Env, {
  get(_t, key: string) {
    return read()[key as keyof Env]
  },
})

/** Throw a clear, operator-facing error if a required var is missing. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = read()[key]
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)}. ` +
        `See .env.example and set it before running this operation.`,
    )
  }
  return value as NonNullable<Env[K]>
}

export const isProd = () => read().NODE_ENV === "production"
export const isDev = () => read().NODE_ENV === "development"
export const isTest = () => read().NODE_ENV === "test"

/* Integration readiness flags — used to surface honest "not configured" UI. */
export const isR2Configured = () => {
  const e = read()
  return Boolean(
    e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET,
  )
}
export const isStripeConfigured = () => Boolean(read().STRIPE_SECRET_KEY)
export const isStripeWebhookConfigured = () => Boolean(read().STRIPE_WEBHOOK_SECRET)
export const isEmailConfigured = () => Boolean(read().RESEND_API_KEY && read().EMAIL_FROM)
export const isVideoConfigured = () =>
  Boolean(read().VIDEO_PROVIDER_API_KEY && read().VIDEO_PROVIDER_API_SECRET)
export const isRecaptchaConfigured = () => Boolean(read().RECAPTCHA_SECRET_KEY)

/** Resolve the app's public base URL for links, redirects, auth. */
export function appUrl(): string {
  const e = read()
  return (
    e.APP_URL ??
    e.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  )
}

/**
 * Startup assertion. Warns in dev/test, throws in production when core vars are
 * absent. Called from instrumentation.ts so it runs once per server boot — not
 * at build time.
 */
export function assertCoreEnv(): void {
  const e = read()
  const missing: string[] = []
  if (!e.DATABASE_URL) missing.push("DATABASE_URL")
  if (!e.BETTER_AUTH_SECRET) missing.push("BETTER_AUTH_SECRET")

  if (missing.length === 0) return

  const msg = `[env] missing core variables: ${missing.join(", ")}`
  if (e.NODE_ENV === "production") {
    throw new Error(msg + " — refusing to start in production.")
  }
  console.warn(
    msg +
      " — running in degraded mode. Database-backed features will fail until set.",
  )
}
