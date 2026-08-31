"use server"

import { z } from "zod"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { promoCode, promoCodeRedemption, user as userT } from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { AppError, toSafeError, validation } from "@/lib/errors"

export type ActionResult = { status: "ok"; message?: string } | { status: "error"; message: string }

export type PromoCodeRow = {
  id: string
  code: string
  description: string | null
  discountType: "PERCENTAGE" | "FIXED"
  discountValue: string
  currency: string | null
  maxRedemptions: number | null
  redemptionCount: number
  maxRedemptionsPerUser: number
  minAmount: string | null
  validFrom: Date | null
  validUntil: Date | null
  active: boolean
  createdAt: Date
}

export async function listPromoCodesAction(): Promise<
  { status: "ok"; codes: PromoCodeRow[] } | { status: "error"; message: string }
> {
  try {
    await requirePermissionOrThrow(PERMISSIONS.PROMO_MANAGE)
    const rows = await db.select().from(promoCode).orderBy(desc(promoCode.createdAt))
    return { status: "ok", codes: rows }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "الكود قصير جدًا")
    .max(40, "الكود طويل جدًا")
    .regex(/^[a-zA-Z0-9_-]+$/, "الكود يقبل حروفًا إنجليزية وأرقامًا و - و _ فقط"),
  description: z.string().trim().max(300).optional().or(z.literal("").transform(() => undefined)),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().positive("قيمة الخصم يجب أن تكون أكبر من صفر"),
  currency: z.string().trim().length(3).optional().or(z.literal("").transform(() => undefined)),
  maxRedemptions: z.coerce.number().int().positive().optional(),
  maxRedemptionsPerUser: z.coerce.number().int().positive().default(1),
  minAmount: z.coerce.number().nonnegative().optional(),
  validFrom: z.string().optional().or(z.literal("").transform(() => undefined)),
  validUntil: z.string().optional().or(z.literal("").transform(() => undefined)),
  active: z.boolean().default(true),
})

function validateBusinessRules(data: z.infer<typeof codeSchema>) {
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
    throw validation("نسبة الخصم لا يمكن أن تتجاوز 100%.")
  }
  if (data.discountType === "FIXED" && !data.currency) {
    throw validation("حدّد العملة عند اختيار خصم بمبلغ ثابت.")
  }
  if (data.validFrom && data.validUntil && new Date(data.validFrom) >= new Date(data.validUntil)) {
    throw validation("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.")
  }
}

export async function createPromoCodeAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requirePermissionOrThrow(PERMISSIONS.PROMO_MANAGE)
    const data = codeSchema.parse(input)
    validateBusinessRules(data)
    const code = data.code.toUpperCase()

    const existing = (
      await db.select({ id: promoCode.id }).from(promoCode).where(eq(promoCode.code, code)).limit(1)
    )[0]
    if (existing) throw validation("هذا الكود مستخدم بالفعل.")

    const inserted = await db
      .insert(promoCode)
      .values({
        code,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: String(data.discountValue),
        currency: data.discountType === "FIXED" ? data.currency! : null,
        maxRedemptions: data.maxRedemptions ?? null,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser,
        minAmount: data.minAmount != null ? String(data.minAmount) : null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        active: data.active,
        createdBy: actor.id,
      })
      .returning({ id: promoCode.id })

    const meta = await requestMeta()
    await writeAudit({
      action: "promo.create",
      actorUserId: actor.id,
      entityType: "promo_code",
      entityId: inserted[0].id,
      metadata: { code },
      ...meta,
    })

    revalidatePath("/admin/promo-codes")
    return { status: "ok", message: `تم إنشاء كود «${code}».` }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

const updateSchema = codeSchema.extend({ id: z.string().min(1) })

export async function updatePromoCodeAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requirePermissionOrThrow(PERMISSIONS.PROMO_MANAGE)
    const data = updateSchema.parse(input)
    validateBusinessRules(data)
    const code = data.code.toUpperCase()

    const existing = (
      await db.select({ id: promoCode.id }).from(promoCode).where(eq(promoCode.code, code)).limit(1)
    )[0]
    if (existing && existing.id !== data.id) throw validation("هذا الكود مستخدم بالفعل.")

    const row = (await db.select().from(promoCode).where(eq(promoCode.id, data.id)).limit(1))[0]
    if (!row) throw new AppError("NOT_FOUND")

    // Never let an edit lower the cap below usage already recorded — that
    // would silently make an already-honoured code look "used up" when it
    // wasn't, or worse, contradict redemptions that already happened.
    if (data.maxRedemptions != null && data.maxRedemptions < row.redemptionCount) {
      throw validation(`لا يمكن تحديد حد أقل من عدد مرات الاستخدام الحالي (${row.redemptionCount}).`)
    }

    await db
      .update(promoCode)
      .set({
        code,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: String(data.discountValue),
        currency: data.discountType === "FIXED" ? data.currency! : null,
        maxRedemptions: data.maxRedemptions ?? null,
        maxRedemptionsPerUser: data.maxRedemptionsPerUser,
        minAmount: data.minAmount != null ? String(data.minAmount) : null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        active: data.active,
        updatedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(promoCode.id, data.id))

    const meta = await requestMeta()
    await writeAudit({
      action: "promo.update",
      actorUserId: actor.id,
      entityType: "promo_code",
      entityId: data.id,
      metadata: { code },
      ...meta,
    })

    revalidatePath("/admin/promo-codes")
    return { status: "ok", message: "تم حفظ التعديلات." }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

export async function setPromoCodeActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const actor = await requirePermissionOrThrow(PERMISSIONS.PROMO_MANAGE)
    const updated = await db
      .update(promoCode)
      .set({ active, updatedBy: actor.id, updatedAt: new Date() })
      .where(eq(promoCode.id, id))
      .returning({ id: promoCode.id, code: promoCode.code })
    if (!updated[0]) throw new AppError("NOT_FOUND")

    const meta = await requestMeta()
    await writeAudit({
      action: active ? "promo.activate" : "promo.deactivate",
      actorUserId: actor.id,
      entityType: "promo_code",
      entityId: id,
      metadata: { code: updated[0].code },
      ...meta,
    })

    revalidatePath("/admin/promo-codes")
    return { status: "ok", message: active ? "تم تفعيل الكود." : "تم إيقاف الكود." }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

export type PromoRedemptionRow = {
  id: string
  userName: string
  discountAmount: string
  currency: string
  createdAt: Date
}

export async function listPromoRedemptionsAction(
  promoCodeId: string,
): Promise<{ status: "ok"; redemptions: PromoRedemptionRow[] } | { status: "error"; message: string }> {
  try {
    await requirePermissionOrThrow(PERMISSIONS.PROMO_MANAGE)
    const rows = await db
      .select({
        id: promoCodeRedemption.id,
        userName: userT.name,
        discountAmount: promoCodeRedemption.discountAmount,
        currency: promoCodeRedemption.currency,
        createdAt: promoCodeRedemption.createdAt,
      })
      .from(promoCodeRedemption)
      .innerJoin(userT, eq(promoCodeRedemption.userId, userT.id))
      .where(eq(promoCodeRedemption.promoCodeId, promoCodeId))
      .orderBy(desc(promoCodeRedemption.createdAt))
      .limit(100)
    return { status: "ok", redemptions: rows }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}
