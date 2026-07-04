"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { favorite } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"

const KindSchema = z.enum(["doctor", "center", "procedure"])

type Kind = z.infer<typeof KindSchema>

export type ToggleResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string }

/**
 * Idempotent toggle. Signed-in patients only. Never audited — favouriting
 * is not a sensitive action and audit log noise would drown the important
 * signals. Uses a single row via the composite unique index.
 */
export async function toggleFavoriteAction(
  kind: Kind,
  refId: string,
): Promise<ToggleResult> {
  try {
    const user = await requireUser()
    const kindParsed = KindSchema.safeParse(kind)
    if (!kindParsed.success) return { ok: false, error: "نوع غير مدعوم" }
    if (!refId || refId.length > 200) return { ok: false, error: "مرجع غير صالح" }

    const existing = await db
      .select({ id: favorite.id })
      .from(favorite)
      .where(
        and(
          eq(favorite.userId, user.id),
          eq(favorite.kind, kindParsed.data),
          eq(favorite.refId, refId),
        ),
      )
      .limit(1)

    if (existing[0]) {
      await db.delete(favorite).where(eq(favorite.id, existing[0].id))
      revalidatePath("/dashboard/favorites")
      return { ok: true, favorited: false }
    }

    await db.insert(favorite).values({
      userId: user.id,
      kind: kindParsed.data,
      refId,
    })
    revalidatePath("/dashboard/favorites")
    return { ok: true, favorited: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "تعذّر حفظ المفضلة",
    }
  }
}
