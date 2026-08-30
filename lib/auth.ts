import { betterAuth } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
import { twoFactor } from "better-auth/plugins"
import { expo } from "@better-auth/expo"
import { pool } from "@/lib/db"
import { betterAuthUrl, env, isGoogleAuthConfigured, trustedAuthOrigins } from "@/lib/env"
import { ROLES } from "@/lib/rbac"
import { logger } from "@/lib/logger"
import { writeAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email"
import { verifyRecaptcha } from "@/lib/security/recaptcha"
import { isExpoNativeAuthRequest } from "@/lib/security/auth-channel"
import { twoFactorOtpEmail, verifyEmailTemplate, resetPasswordEmailTemplate } from "@/lib/email-templates"
import { isLocale, type Locale } from "@/lib/i18n/config"

/** additionalFields carries `locale` through on every user record the
 *  plugin callbacks receive — fall back to Arabic for the rare row that
 *  predates the column or has an unrecognized value. */
function userLocale(user: object): Locale {
  const value = "locale" in user && typeof user.locale === "string" ? user.locale : undefined
  return isLocale(value) ? value : "ar"
}

/**
 * The sign-up/sign-in forms call `executeRecaptcha("auth_submit")` and send
 * the token as an extra `recaptchaToken` body field — Better Auth ignores
 * unknown fields in its own endpoint schemas, so the check must happen here,
 * before the endpoint runs, not in the endpoint's own validated body. Without
 * this, the client-side widget ran but nothing ever verified its result:
 * scripting straight against /sign-up/email or /sign-in/email skipped it
 * entirely.
 */
const recaptchaGate = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-up/email" && ctx.path !== "/sign-in/email") return
  if (isExpoNativeAuthRequest(ctx.headers)) return
  const token = (ctx.body as { recaptchaToken?: string } | undefined)?.recaptchaToken
  const result = await verifyRecaptcha(token, "auth_submit")
  if (!result.success) {
    logger.warn("Authentication reCAPTCHA rejected", {
      path: ctx.path,
      reason: result.reason ?? "unknown",
    })
    throw new APIError("BAD_REQUEST", { message: "تعذّر التحقق من أنك لست روبوتًا، حاول مرة أخرى." })
  }
})

/**
 * Better Auth configuration.
 *
 * SECURITY: `role` is `input: false` — clients can never set their own role at
 * signup. Public signup always yields a PATIENT. Provider/admin roles are only
 * granted later through the reviewed Provider Application flow.
 */
export const auth = betterAuth({
  database: pool,
  // Placeholder keeps `next build` working without secrets; assertCoreEnv()
  // refuses to boot the server in production if the real secret is missing.
  secret: env.BETTER_AUTH_SECRET ?? "build-time-placeholder-change-me-32chars",
  baseURL: betterAuthUrl(),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // Enable strict email verification in production by setting this true once
    // an email provider is configured. Kept false so dev flows work without keys.
    requireEmailVerification: false,
    async sendResetPassword({ user, url }) {
      const { subject, html } = resetPasswordEmailTemplate({ locale: userLocale(user), url })
      await sendEmail({ to: user.email, subject, html })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      const { subject, html } = verifyEmailTemplate({ locale: userLocale(user), url })
      await sendEmail({ to: user.email, subject, html })
    },
  },

  // Left out entirely (not just empty) when unconfigured — Better Auth
  // otherwise still registers the /callback/google route, which would 500
  // on first use instead of the button simply never appearing.
  ...(isGoogleAuthConfigured()
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        },
        account: {
          accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
            // Google verifies the email itself; requiring our own (optional,
            // not enforced today — emailAndPassword.requireEmailVerification
            // is false) verification too would block "Sign in with Google"
            // for the many existing accounts that never verified.
            requireLocalEmailVerified: false,
          },
        },
      }
    : {}),

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: ROLES.PATIENT,
        input: false, // ← clients cannot assign roles
      },
      status: { type: "string", required: false, input: false },
      phone: { type: "string", required: false },
      country: { type: "string", required: false },
      locale: { type: "string", required: false, defaultValue: "ar" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },

  advanced: {
    cookiePrefix: "medaura",
    // NOTE: do NOT force secure/sameSite=none in development — that breaks
    // login on http://localhost. Better Auth's defaults are correct per-env.

    /**
     * Without this, EVERY request shares one rate-limit bucket per path.
     *
     * Better Auth resolves the client IP from `x-forwarded-for`, but with no
     * `trustedProxies` configured it refuses to guess which hop is the client
     * (`getIPFromHeader`: `if (forwardedIps.length !== 1) return null`).
     * Behind Render the header is a chain, never a single value, so it always
     * returned null and every user fell into the shared `NO_TRUSTED_IP` bucket
     * — which is what logged "Rate limiting could not determine a client IP"
     * on every boot. That is both a security hole (brute-force protection
     * keyed globally instead of per attacker) and an availability bug (all
     * users combined get max 30 requests/60s per path).
     *
     * Listing the private ranges lets it walk the chain from the right,
     * skip our own infrastructure hops, and stop at the first public address
     * — the real client. Spoofed values a client injects land to the LEFT of
     * the address the proxy itself observed, so they are ignored rather than
     * trusted.
     */
    ipAddress: {
      trustedProxies: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8"],
    },
  },

  // The native app authenticates over the same endpoints; its custom scheme
  // must be trusted or Better Auth's CSRF origin check rejects it.
  trustedOrigins: trustedAuthOrigins(),

  hooks: {
    before: recaptchaGate,
  },

  plugins: [
    expo(),
    // Two-factor: the patient/doctor picks which method(s) to enable from
    // /dashboard/security (web) or the equivalent native screen — email OTP,
    // an authenticator app (TOTP), or both. Enabling either flips
    // user.twoFactorEnabled and challenges every future sign-in; enabling
    // both lets the sign-in screen offer a choice. Backup codes are always
    // issued alongside enablement as the account-recovery fallback.
    twoFactor({
      issuer: "Med Aura",
      otpOptions: {
        period: 3, // minutes — matches the copy in twoFactorOtpEmail
        digits: 6,
        storeOTP: "hashed",
        async sendOTP({ user, otp }) {
          const { subject, html } = twoFactorOtpEmail({
            locale: userLocale(user),
            code: otp,
            expiresInMinutes: 3,
          })
          await sendEmail({ to: user.email, subject, html })
        },
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: "encrypted",
      },
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        // PostgreSQL provisions patient_profile + user_role in the SAME
        // transaction as the user INSERT (migration trigger). This post-commit
        // hook is deliberately audit-only; it must never be the integrity
        // boundary for account provisioning.
        async after(createdUser) {
          await writeAudit({
            action: "auth.signup",
            actorUserId: createdUser.id,
            entityType: "user",
            entityId: createdUser.id,
          })
        },
      },
    },
    session: {
      create: {
        async after(createdSession) {
          await writeAudit({
            action: "auth.login",
            actorUserId: createdSession.userId,
            entityType: "session",
            entityId: createdSession.id,
            ip: createdSession.ipAddress ?? null,
            userAgent: createdSession.userAgent ?? null,
          })
        },
      },
    },
  },
})

