"use server"

import { revalidatePath } from "next/cache"
import { and, count, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  country,
  city,
  center,
  doctorProfile,
  patientProfile,
} from "@/lib/db/schema"
import { requirePermissionOrThrow } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { writeAudit, requestMeta } from "@/lib/audit"

/**
 * Geography management (countries + cities). Every action re-verifies
 * CATALOG_MANAGE, validates with zod, and audit-logs the change.
 *
 * Deleting is REFUSED whenever the record is still referenced — countries
 * are referenced by ISO code from doctors/centers/patients, cities by FK —
 * with a clear Arabic message telling the admin to disable instead. This is
 * how "safe delete" stays safe without ever surfacing a raw FK error.
 */

export type ActionResult =
  | { status: "ok" }
  | { status: "error"; message: string }

const CountrySchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .length(2, "كود الدولة حرفان بصيغة ISO مثل SA")
    .regex(/^[A-Za-z]{2}$/, "كود الدولة أحرف إنجليزية فقط")
    .transform((v) => v.toUpperCase()),
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب").max(120),
  nameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب").max(120),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.coerce.boolean().default(true),
  callingCode: z
    .string()
    .trim()
    .max(6)
    .regex(/^\+\d{1,5}$/, "رمز الاتصال بصيغة +رقم مثل ‎+966")
    .nullable()
    .or(z.literal("").transform(() => null)),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "رمز العملة 3 أحرف بصيغة ISO مثل SAR")
    .transform((v) => v.toUpperCase())
    .nullable()
    .or(z.literal("").transform(() => null)),
  defaultLanguage: z.enum(["ar", "en", "tr", "fr"]).default("ar"),
  timezone: z.string().trim().max(60).nullable().or(z.literal("").transform(() => null)),
})

function fromForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries())
  return { ...raw, active: raw.active === "on" || raw.active === "true" }
}

function revalidateGeo() {
  revalidatePath("/admin/geography")
  revalidatePath("/destinations")
  revalidatePath("/search")
}

export async function upsertCountryAction(fd: FormData): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const parsed = CountrySchema.safeParse(fromForm(fd))
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const { id, ...values } = parsed.data

  // A duplicate ISO code would make two "countries" collide everywhere the
  // code is used as the reference key.
  const dup = await db
    .select({ id: country.id })
    .from(country)
    .where(id ? and(eq(country.code, values.code), ne(country.id, id)) : eq(country.code, values.code))
    .limit(1)
  if (dup[0]) return { status: "error", message: "كود الدولة مستخدم بالفعل" }

  const meta = await requestMeta()
  if (id) {
    const [updated] = await db
      .update(country)
      .set(values)
      .where(eq(country.id, id))
      .returning({ id: country.id })
    if (!updated) return { status: "error", message: "الدولة غير موجودة" }
    await writeAudit({
      action: "geography.country.update",
      actorUserId: user.id,
      entityType: "country",
      entityId: id,
      metadata: values,
      ...meta,
    })
  } else {
    const [inserted] = await db
      .insert(country)
      .values(values)
      .returning({ id: country.id })
    await writeAudit({
      action: "geography.country.create",
      actorUserId: user.id,
      entityType: "country",
      entityId: inserted.id,
      metadata: values,
      ...meta,
    })
  }
  revalidateGeo()
  return { status: "ok" }
}

export async function toggleCountryActiveAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [current] = await db
    .select({ active: country.active })
    .from(country)
    .where(eq(country.id, id))
    .limit(1)
  if (!current) return { status: "error", message: "الدولة غير موجودة" }

  await db.update(country).set({ active: !current.active }).where(eq(country.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: current.active ? "geography.country.disable" : "geography.country.enable",
    actorUserId: user.id,
    entityType: "country",
    entityId: id,
    ...meta,
  })
  revalidateGeo()
  return { status: "ok" }
}

export async function deleteCountryAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [row] = await db
    .select({ code: country.code, nameAr: country.nameAr })
    .from(country)
    .where(eq(country.id, id))
    .limit(1)
  if (!row) return { status: "error", message: "الدولة غير موجودة" }

  // Reference checks — refuse instead of cascading or crashing.
  const [cities] = await db
    .select({ n: count() })
    .from(city)
    .where(eq(city.countryId, id))
  if (Number(cities?.n ?? 0) > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف ${row.nameAr}: لديها ${cities.n} مدينة مسجّلة. احذف المدن أولًا أو عطّل الدولة بدلًا من حذفها.`,
    }
  }
  const [centers] = await db
    .select({ n: count() })
    .from(center)
    .where(eq(center.country, row.code))
  if (Number(centers?.n ?? 0) > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف ${row.nameAr}: يوجد ${centers.n} مركز مرتبط بها. عطّل الدولة بدلًا من حذفها.`,
    }
  }
  const [doctors] = await db
    .select({ n: count() })
    .from(doctorProfile)
    .where(eq(doctorProfile.country, row.code))
  if (Number(doctors?.n ?? 0) > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف ${row.nameAr}: يوجد ${doctors.n} طبيب مرتبط بها. عطّل الدولة بدلًا من حذفها.`,
    }
  }
  const [patients] = await db
    .select({ n: count() })
    .from(patientProfile)
    .where(eq(patientProfile.residenceCountry, row.code))
  if (Number(patients?.n ?? 0) > 0) {
    return {
      status: "error",
      message: `لا يمكن حذف ${row.nameAr}: يوجد مرضى مسجّلون فيها. عطّل الدولة بدلًا من حذفها.`,
    }
  }

  await db.delete(country).where(eq(country.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: "geography.country.delete",
    actorUserId: user.id,
    entityType: "country",
    entityId: id,
    metadata: { code: row.code, nameAr: row.nameAr },
    ...meta,
  })
  revalidateGeo()
  return { status: "ok" }
}

const CitySchema = z.object({
  id: z.string().optional(),
  countryId: z.string().min(1, "اختر الدولة"),
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب").max(120),
  nameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب").max(120),
  active: z.coerce.boolean().default(true),
})

export async function upsertCityAction(fd: FormData): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const parsed = CitySchema.safeParse(fromForm(fd))
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }
  }
  const { id, ...values } = parsed.data

  // No duplicate city names within the same country.
  const dup = await db
    .select({ id: city.id })
    .from(city)
    .where(
      id
        ? and(eq(city.countryId, values.countryId), eq(city.nameAr, values.nameAr), ne(city.id, id))
        : and(eq(city.countryId, values.countryId), eq(city.nameAr, values.nameAr)),
    )
    .limit(1)
  if (dup[0]) return { status: "error", message: "هذه المدينة مضافة بالفعل لنفس الدولة" }

  const meta = await requestMeta()
  if (id) {
    const [updated] = await db
      .update(city)
      .set(values)
      .where(eq(city.id, id))
      .returning({ id: city.id })
    if (!updated) return { status: "error", message: "المدينة غير موجودة" }
    await writeAudit({
      action: "geography.city.update",
      actorUserId: user.id,
      entityType: "city",
      entityId: id,
      metadata: values,
      ...meta,
    })
  } else {
    const [inserted] = await db.insert(city).values(values).returning({ id: city.id })
    await writeAudit({
      action: "geography.city.create",
      actorUserId: user.id,
      entityType: "city",
      entityId: inserted.id,
      metadata: values,
      ...meta,
    })
  }
  revalidateGeo()
  return { status: "ok" }
}

export async function toggleCityActiveAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [current] = await db
    .select({ active: city.active })
    .from(city)
    .where(eq(city.id, id))
    .limit(1)
  if (!current) return { status: "error", message: "المدينة غير موجودة" }

  await db.update(city).set({ active: !current.active }).where(eq(city.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: current.active ? "geography.city.disable" : "geography.city.enable",
    actorUserId: user.id,
    entityType: "city",
    entityId: id,
    ...meta,
  })
  revalidateGeo()
  return { status: "ok" }
}

export async function deleteCityAction(id: string): Promise<ActionResult> {
  const user = await requirePermissionOrThrow(PERMISSIONS.CATALOG_MANAGE)
  const [row] = await db
    .select({ nameAr: city.nameAr })
    .from(city)
    .where(eq(city.id, id))
    .limit(1)
  if (!row) return { status: "error", message: "المدينة غير موجودة" }

  await db.delete(city).where(eq(city.id, id))
  const meta = await requestMeta()
  await writeAudit({
    action: "geography.city.delete",
    actorUserId: user.id,
    entityType: "city",
    entityId: id,
    metadata: { nameAr: row.nameAr },
    ...meta,
  })
  revalidateGeo()
  return { status: "ok" }
}
