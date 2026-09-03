"use server"

import { z } from "zod"
import { and, count, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { referral, referralSettings } from "@/lib/db/schema"
import { requirePermissionOrThrow, requireUser } from "@/lib/session"
import { getUserRoles, PERMISSIONS, ROLES } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"
import { forbidden, toSafeError, validation } from "@/lib/errors"
import { getOrCreateReferralCode } from "@/lib/referral"
import { appUrl } from "@/lib/env"
import { isLocale, localizedPath } from "@/lib/i18n/config"

export type ActionResult = { status: "ok"; message?: string } | { status: "error"; message: string }

export type ReferralSettingsRow = {
  id: string | null
  active: boolean
  referrerRewardType: "PERCENTAGE" | "FIXED"
  referrerRewardValue: string
  refereeRewardType: "PERCENTAGE" | "FIXED"
  refereeRewardValue: string
  currency: string
  rewardValidDays: number
}

const DEFAULT_SETTINGS: ReferralSettingsRow = {
  id: null,
  active: false,
  referrerRewardType: "FIXED",
  referrerRewardValue: "50.00",
  refereeRewardType: "FIXED",
  refereeRewardValue: "50.00",
  currency: "SAR",
  rewardValidDays: 90,
}

export async function getReferralSettingsAction(): Promise<
  { status: "ok"; settings: ReferralSettingsRow } | { status: "error"; message: string }
> {
  try {
    await requirePermissionOrThrow(PERMISSIONS.REFERRAL_MANAGE)
    const row = (
      await db.select().from(referralSettings).orderBy(desc(referralSettings.updatedAt)).limit(1)
    )[0]
    return { status: "ok", settings: row ?? DEFAULT_SETTINGS }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

const settingsSchema = z.object({
  active: z.boolean(),
  referrerRewardType: z.enum(["PERCENTAGE", "FIXED"]),
  referrerRewardValue: z.coerce.number().positive("قيمة مكافأة الداعي يجب أن تكون أكبر من صفر"),
  refereeRewardType: z.enum(["PERCENTAGE", "FIXED"]),
  refereeRewardValue: z.coerce.number().positive("قيمة مكافأة المدعو يجب أن تكون أكبر من صفر"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "رمز العملة يجب أن يتكون من 3 أحرف"),
  rewardValidDays: z.coerce
    .number()
    .int()
    .min(1, "عدد الأيام يجب أن يكون أكبر من صفر")
    .max(3650, "مدة الصلاحية لا يمكن أن تتجاوز 10 سنوات"),
})

function validateRewardRange(data: z.infer<typeof settingsSchema>) {
  if (data.referrerRewardType === "PERCENTAGE" && data.referrerRewardValue > 100) {
    throw validation("نسبة مكافأة الداعي لا يمكن أن تتجاوز 100%.")
  }
  if (data.refereeRewardType === "PERCENTAGE" && data.refereeRewardValue > 100) {
    throw validation("نسبة مكافأة المدعو لا يمكن أن تتجاوز 100%.")
  }
}

/** Upserts the single settings row — every reward value here is admin-set,
 *  never a source-code constant. */
export async function updateReferralSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requirePermissionOrThrow(PERMISSIONS.REFERRAL_MANAGE)
    const data = settingsSchema.parse(input)
    validateRewardRange(data)

    const existing = (
      await db.select({ id: referralSettings.id }).from(referralSettings).orderBy(desc(referralSettings.updatedAt)).limit(1)
    )[0]

    const values = {
      active: data.active,
      referrerRewardType: data.referrerRewardType,
      referrerRewardValue: String(data.referrerRewardValue),
      refereeRewardType: data.refereeRewardType,
      refereeRewardValue: String(data.refereeRewardValue),
      currency: data.currency.toUpperCase(),
      rewardValidDays: data.rewardValidDays,
    }

    if (existing) {
      await db
        .update(referralSettings)
        .set({ ...values, updatedBy: actor.id, updatedAt: new Date() })
        .where(eq(referralSettings.id, existing.id))
    } else {
      await db.insert(referralSettings).values({ ...values, createdBy: actor.id })
    }

    const meta = await requestMeta()
    await writeAudit({
      action: "referral_settings.update",
      actorUserId: actor.id,
      entityType: "referral_settings",
      entityId: existing?.id ?? "new",
      metadata: values,
      ...meta,
    })

    revalidatePath("/admin/referral-settings")
    return { status: "ok", message: "تم حفظ إعدادات برنامج الدعوات." }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}

export type MyReferralData = {
  code: string
  shareUrl: string
  invitedCount: number
  rewardedCount: number
  programActive: boolean
  refereeRewardType: "PERCENTAGE" | "FIXED"
  refereeRewardValue: string
  referrerRewardType: "PERCENTAGE" | "FIXED"
  referrerRewardValue: string
  currency: string
}

/** Patient-facing: their own code, share link, and simple stats. */
export async function getMyReferralAction(): Promise<
  { status: "ok"; data: MyReferralData } | { status: "error"; message: string }
> {
  try {
    const me = await requireUser()
    const roles = await getUserRoles(me.id)
    if (!roles.includes(ROLES.PATIENT)) throw forbidden()
    const code = await getOrCreateReferralCode(me.id)
    const settings = (
      await db.select().from(referralSettings).orderBy(desc(referralSettings.updatedAt)).limit(1)
    )[0]

    const [invited, rewarded] = await Promise.all([
      db.select({ n: count() }).from(referral).where(eq(referral.referrerUserId, me.id)),
      db
        .select({ n: count() })
        .from(referral)
        .where(and(eq(referral.referrerUserId, me.id), eq(referral.status, "REWARDED"))),
    ])

    const active = settings?.active ?? false
    const locale = isLocale(me.locale) ? me.locale : "ar"

    return {
      status: "ok",
      data: {
        code,
        shareUrl: `${appUrl().replace(/\/$/, "")}${localizedPath("/sign-up", locale)}?ref=${code}`,
        invitedCount: invited[0]?.n ?? 0,
        rewardedCount: rewarded[0]?.n ?? 0,
        programActive: active,
        refereeRewardType: settings?.refereeRewardType ?? DEFAULT_SETTINGS.refereeRewardType,
        refereeRewardValue: settings?.refereeRewardValue ?? DEFAULT_SETTINGS.refereeRewardValue,
        referrerRewardType: settings?.referrerRewardType ?? DEFAULT_SETTINGS.referrerRewardType,
        referrerRewardValue: settings?.referrerRewardValue ?? DEFAULT_SETTINGS.referrerRewardValue,
        currency: settings?.currency ?? DEFAULT_SETTINGS.currency,
      },
    }
  } catch (err) {
    const safe = toSafeError(err)
    return { status: "error", message: safe.userMessage }
  }
}
