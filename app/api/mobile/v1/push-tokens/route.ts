import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { pushToken } from "@/lib/db/schema"
import { jsonError, jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const RegisterSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["android", "ios"]).optional(),
})

/** Registers (or re-confirms) this device's Expo push token for the
 *  signed-in user. Safe to call on every app boot — it upserts. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) return jsonError("رمز غير صالح.", 400)
  const { token, platform } = parsed.data

  try {
    const existing = await db
      .select({ id: pushToken.id })
      .from(pushToken)
      .where(eq(pushToken.token, token))
      .limit(1)

    if (existing[0]) {
      // Same token re-registering — including under a different account, if
      // a shared device signs out and someone else signs in — reassign
      // rather than duplicate.
      await db
        .update(pushToken)
        .set({
          userId: auth.user.id,
          platform: platform ?? "android",
          lastSeenAt: new Date(),
        })
        .where(eq(pushToken.id, existing[0].id))
    } else {
      await db.insert(pushToken).values({
        userId: auth.user.id,
        token,
        platform: platform ?? "android",
      })
    }
    return jsonOk({ registered: true })
  } catch {
    return jsonError("تعذّر تسجيل الجهاز.", 500)
  }
}

const UnregisterSchema = z.object({ token: z.string().min(10) })

/** Removes this device's token — call on sign-out, so a shared or reset
 *  device never keeps receiving pushes meant for the previous account. */
export async function DELETE(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = UnregisterSchema.safeParse(body)
  if (!parsed.success) return jsonError("رمز غير صالح.", 400)

  await db
    .delete(pushToken)
    .where(and(eq(pushToken.token, parsed.data.token), eq(pushToken.userId, auth.user.id)))
  return jsonOk({ removed: true })
}
