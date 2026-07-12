import { betterAuth } from "better-auth"
import { expo } from "@better-auth/expo"
import { eq } from "drizzle-orm"
import { pool, db } from "@/lib/db"
import { patientProfile, role as roleTable, userRole } from "@/lib/db/schema"
import { env, appUrl } from "@/lib/env"
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
  baseURL: appUrl(),

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
  },

  // The native app authenticates over the same endpoints; its custom scheme
  // must be trusted or Better Auth's CSRF origin check rejects it.
  trustedOrigins: [appUrl(), "medaura://"],

  plugins: [expo()],

  databaseHooks: {
    user: {
      create: {
        // After a new account is created, provision the patient profile and
        // assign the PATIENT role in the RBAC tables. Failures here are logged
        // but never block signup.
        async after(createdUser) {
          try {
            await db
              .insert(patientProfile)
              .values({ userId: createdUser.id, language: "ar" })
              .onConflictDoNothing()

            const patientRole = await db
              .select({ id: roleTable.id })
              .from(roleTable)
              .where(eq(roleTable.key, ROLES.PATIENT))
              .limit(1)

            if (patientRole[0]) {
              await db
                .insert(userRole)
                .values({ userId: createdUser.id, roleId: patientRole[0].id })
                .onConflictDoNothing()
            } else {
              logger.warn("patient role not seeded; skipped RBAC assignment", {
                userId: createdUser.id,
              })
            }

            await writeAudit({
              action: "auth.signup",
              actorUserId: createdUser.id,
              entityType: "user",
              entityId: createdUser.id,
            })
          } catch (err) {
            logger.error("post-signup provisioning failed", {
              userId: createdUser.id,
              error: err instanceof Error ? err.message : String(err),
            })
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
