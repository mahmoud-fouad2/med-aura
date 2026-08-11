import { z } from "zod"
import { toggleFavorite } from "@/lib/data/favorites"
import { jsonError, jsonOk, jsonServerError, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

const ToggleSchema = z.object({
  kind: z.enum(["doctor", "center", "procedure"]),
  refId: z.string().min(1).max(200),
})

/** Idempotent add/remove of one favourite. Returns the resulting state so the
 *  app can reconcile its optimistic heart. */
export async function POST(request: Request) {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const parsed = ToggleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return jsonError("طلب غير صالح.", 400)
  try {
    const favorited = await toggleFavorite(
      auth.user.id,
      parsed.data.kind,
      parsed.data.refId,
    )
    return jsonOk({ favorited })
  } catch (err) {
    return jsonServerError("mobile.favorites.toggle", err)
  }
}
