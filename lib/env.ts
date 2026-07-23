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
  BETTER_AUTH_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  // 32-byte (64 hex char) key for encrypting sensitive fields at rest.
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Cloudflare R2 / S3-compatible storage
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  // Stripe (payments, test mode). Checkout is redirect-based, so only the
  // server secret + webhook secret are consumed (no publishable key needed).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email (transactional)
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Video consultation provider (optional). "daily" is the supported real
  // provider; "mock" is for local development/tests only and is refused in
  // production. Unset → video consultations stay in an honest "disabled"
  // state (no join buttons anywhere).
  VIDEO_PROVIDER: z.enum(["daily", "mock"]).optional(),
  VIDEO_PROVIDER_API_KEY: z.string().optional(),
  VIDEO_PROVIDER_API_SECRET: z.string().optional(),
  VIDEO_WEBHOOK_SECRET: z.string().optional(),
  /** Minutes before the appointment start when joining opens (default 10). */
  VIDEO_JOIN_WINDOW_BEFORE_MINUTES: z.coerce.number().int().min(0).max(120).optional(),
  /** Minutes after the appointment end when joining closes (default 30). */
  VIDEO_JOIN_WINDOW_AFTER_MINUTES: z.coerce.number().int().min(0).max(240).optional(),

  // reCAPTCHA. Server-side verification is wired into the contact action; the
  // client token widget is not implemented yet, so no site key is consumed.
  RECAPTCHA_SECRET_KEY: z.string().optional(),

  // Ops
  ENABLE_DEMO_DATA: z.string().optional(),
  MONITORING_WEBHOOK_URL: z.string().optional(),
  // QA only: unlocks the admin "mark test-paid" tool so a booking can be
  // confirmed without a real charge, to exercise the video journey end to
  // end. Refused in production unless explicitly set, and always requires an
  // admin session on top. Never enable on a real-patient environment.
  ENABLE_TEST_PAYMENT_TOOLS: z.string().optional(),
  // QA only: unlocks the admin "create test video session" tool — a real
  // Daily room + tokens for two isTest=true accounts, no appointment or
  // payment involved. Off by default everywhere; never enable on a
  // real-patient environment.
  ENABLE_VIDEO_QA_TOOLS: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

const URL_ENV_KEYS = [
  "APP_URL",
  "BETTER_AUTH_URL",
  "R2_PUBLIC_BASE_URL",
  "MONITORING_WEBHOOK_URL",
] as const

type UrlEnvKey = (typeof URL_ENV_KEYS)[number]

function normalizeUrlEnvValues(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalized = { ...raw }
  for (const key of URL_ENV_KEYS) {
    const value = normalized[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      normalized[key] = trimmed === "" ? undefined : trimmed
    }
  }
  return normalized
}

function validatePublicUrl(key: UrlEnvKey, value: string | undefined): string | null {
  if (!value) return null
  if (new RegExp(`^${key}\\s*=`).test(value)) {
    throw new Error(
      `${key} value must be only the URL, for example https://medauraworld.com. ` +
        `Do not paste "${key}=..." into the value field.`,
    )
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${key} must be a valid absolute URL.`)
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${key} must use http:// or https://.`)
  }
  const isLocalHost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]"
  if (parsed.protocol === "http:" && !isLocalHost) {
    throw new Error(`${key} must use https:// outside local development.`)
  }
  if (!parsed.hostname) {
    throw new Error(`${key} must include a hostname.`)
  }

  return parsed.href.replace(/\/$/, "")
}

function collectUrlProblems(e: Env): string[] {
  const problems: string[] = []
  for (const key of URL_ENV_KEYS) {
    try {
      validatePublicUrl(key, e[key])
    } catch (err) {
      problems.push(err instanceof Error ? err.message : `${key} is invalid`)
    }
  }
  return problems
}

function read(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(normalizeUrlEnvValues(process.env))
  if (!parsed.success) {
    // Should be rare since URL format is validated separately. Keep the valid
    // core values so one malformed optional field cannot mask real state.
    console.error(
      "[env] invalid environment:",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    )
    cached = schema.parse({
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    })
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
export const isVideoConfigured = () => {
  const e = read()
  if (e.VIDEO_PROVIDER === "mock") return e.NODE_ENV !== "production"
  return e.VIDEO_PROVIDER === "daily" && Boolean(e.VIDEO_PROVIDER_API_KEY)
}
/** QA test-payment tool is gated by an explicit opt-in flag. */
export const isTestPaymentEnabled = () =>
  read().ENABLE_TEST_PAYMENT_TOOLS === "true"
/** QA video-session tool is gated by an explicit opt-in flag. */
export const isVideoQaEnabled = () => read().ENABLE_VIDEO_QA_TOOLS === "true"
export const isRecaptchaConfigured = () => Boolean(read().RECAPTCHA_SECRET_KEY)

/** Resolve the app's public base URL for links, redirects, auth. */
export function appUrl(): string {
  const e = read()
  const configured =
    validatePublicUrl("APP_URL", e.APP_URL) ??
    validatePublicUrl("BETTER_AUTH_URL", e.BETTER_AUTH_URL)
  if (configured) return configured
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000"
}

export function betterAuthUrl(): string {
  const e = read()
  return (
    validatePublicUrl("BETTER_AUTH_URL", e.BETTER_AUTH_URL) ??
    validatePublicUrl("APP_URL", e.APP_URL) ??
    appUrl()
  )
}

export function trustedAuthOrigins(): string[] {
  const origins = new Set<string>()
  for (const url of [appUrl(), betterAuthUrl()]) {
    const parsed = new URL(url)
    origins.add(parsed.origin)
    if (parsed.hostname === "medauraworld.com") {
      origins.add("https://www.medauraworld.com")
    }
    if (parsed.hostname === "www.medauraworld.com") {
      origins.add("https://medauraworld.com")
    }
  }
  origins.add("medaura://")
  return Array.from(origins)
}

/**
 * Startup assertion. Warns in dev/test, throws in production when core vars are
 * absent. Called from instrumentation.ts so it runs once per server boot — not
 * at build time.
 */
export function assertCoreEnv(): void {
  const e = read()
  const prod = e.NODE_ENV === "production"

  const missing: string[] = []
  if (!e.DATABASE_URL) missing.push("DATABASE_URL")
  if (!e.BETTER_AUTH_SECRET) missing.push("BETTER_AUTH_SECRET")
  // ENCRYPTION_KEY is only strictly required in production (lib/crypto derives a
  // clearly-warned insecure dev key otherwise).
  if (prod && !e.ENCRYPTION_KEY) missing.push("ENCRYPTION_KEY")

  const problems: string[] = []
  problems.push(...collectUrlProblems(e))
  // Demo data must never be enabled in production.
  if (prod && e.ENABLE_DEMO_DATA === "true") {
    problems.push("ENABLE_DEMO_DATA must not be 'true' in production")
  }

  if (missing.length === 0 && problems.length === 0) return

  const parts: string[] = []
  if (missing.length) parts.push(`missing core variables: ${missing.join(", ")}`)
  if (problems.length) parts.push(problems.join("; "))
  const msg = `[env] ${parts.join(" | ")}`

  if (prod) {
    throw new Error(msg + " — refusing to start in production.")
  }
  console.warn(
    msg +
      " — running in degraded mode. Database-backed features will fail until set.",
  )
}
