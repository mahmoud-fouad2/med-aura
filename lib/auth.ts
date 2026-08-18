import { betterAuth } from "better-auth"
import { expo } from "@better-auth/expo"
import { eq } from "drizzle-orm"
import { pool, db } from "@/lib/db"
import { patientProfile, role as roleTable, userRole } from "@/lib/db/schema"
import { betterAuthUrl, env, isGoogleAuthConfigured, trustedAuthOrigins } from "@/lib/env"
import { ROLES } from "@/lib/rbac"
import { logger } from "@/lib/logger"
import { writeAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email"

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
      await sendEmail({
        to: user.email,
        subject: "إعادة تعيين كلمة المرور — Med Aura",
        html: resetPasswordEmail(url),
      })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "تأكيد بريدك الإلكتروني — Med Aura",
        html: verifyEmail(url),
      })
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

  plugins: [expo()],

  databaseHooks: {
    user: {
      create: {
        // After a new account is created, provision the patient profile and
        // assign the PATIENT role in one transaction. The follow-up onboarding
        // action also repairs the same profile row if the auth provider retries.
        async after(createdUser) {
          try {
            await db.transaction(async (tx) => {
              await tx
                .insert(patientProfile)
                .values({ userId: createdUser.id, language: "ar" })
                .onConflictDoNothing()

              const patientRole = await tx
                .select({ id: roleTable.id })
                .from(roleTable)
                .where(eq(roleTable.key, ROLES.PATIENT))
                .limit(1)

              if (!patientRole[0]) {
                logger.warn("patient role not seeded; skipped RBAC assignment", {
                  userId: createdUser.id,
                })
                return
              }

              await tx
                .insert(userRole)
                .values({ userId: createdUser.id, roleId: patientRole[0].id })
                .onConflictDoNothing()

              await writeAudit({
                action: "auth.signup",
                actorUserId: createdUser.id,
                entityType: "user",
                entityId: createdUser.id,
              }, tx)
            })
          } catch (err) {
            logger.error("post-signup provisioning failed", {
              userId: createdUser.id,
              error: err instanceof Error ? err.message : String(err),
            })
            try {
              await db
                .insert(patientProfile)
                .values({ userId: createdUser.id, language: "ar" })
                .onConflictDoNothing()
            } catch (repairErr) {
              logger.error("post-signup profile repair failed", {
                userId: createdUser.id,
                error: repairErr instanceof Error ? repairErr.message : String(repairErr),
              })
            }
          }
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

function verifyEmail(url: string): string {
  return `<div dir="rtl" style="font-family:sans-serif">
    <h2>مرحبًا بك في Med Aura</h2>
    <p>لتأكيد بريدك الإلكتروني، يرجى الضغط على الرابط التالي:</p>
    <p><a href="${url}">تأكيد البريد الإلكتروني</a></p>
  </div>`
}

function resetPasswordEmail(url: string): string {
  return `<div dir="rtl" style="font-family:sans-serif">
    <h2>إعادة تعيين كلمة المرور</h2>
    <p>تلقّينا طلبًا لإعادة تعيين كلمة المرور. اضغط على الرابط التالي للمتابعة:</p>
    <p><a href="${url}">إعادة تعيين كلمة المرور</a></p>
    <p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p>
  </div>`
}
