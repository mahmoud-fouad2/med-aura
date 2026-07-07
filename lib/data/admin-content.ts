import { asc, desc, eq, ilike, inArray, or } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { country as countryT, city as cityT, procedureCategory, procedure as procedureT, user as userT, userRole, role as roleT, session as sessionT } from "@/lib/db/schema"

export type AdminCountryRow = {
  id: string
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
  active: boolean
  cityCount: number
  callingCode: string | null
  currencyCode: string | null
  defaultLanguage: string
  timezone: string | null
}

export async function listCountriesForAdmin(): Promise<AdminCountryRow[]> {
  if (!isDbConfigured) return []
  const countries = await db.select().from(countryT).orderBy(asc(countryT.sortOrder))
  if (countries.length === 0) return []
  const cities = await db.select({ countryId: cityT.countryId }).from(cityT).where(inArray(cityT.countryId, countries.map((c) => c.id)))
  const countByCountry = new Map<string, number>()
  for (const c of cities) countByCountry.set(c.countryId, (countByCountry.get(c.countryId) ?? 0) + 1)
  return countries.map((c) => ({
    id: c.id,
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    sortOrder: c.sortOrder,
    active: c.active,
    cityCount: countByCountry.get(c.id) ?? 0,
    callingCode: c.callingCode,
    currencyCode: c.currencyCode,
    defaultLanguage: c.defaultLanguage,
    timezone: c.timezone,
  }))
}

export type AdminCityRow = {
  id: string
  countryId: string
  nameAr: string
  nameEn: string
  countryNameAr: string
  active: boolean
}

export async function listCitiesForAdmin(): Promise<AdminCityRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: cityT.id,
      countryId: cityT.countryId,
      nameAr: cityT.nameAr,
      nameEn: cityT.nameEn,
      countryNameAr: countryT.nameAr,
      active: cityT.active,
    })
    .from(cityT)
    .innerJoin(countryT, eq(cityT.countryId, countryT.id))
    .orderBy(asc(countryT.sortOrder), asc(cityT.nameAr))
}

export type AdminCategoryRow = {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  icon: string | null
  sortOrder: number
  visible: boolean
  procedureCount: number
}

export async function listCategoriesForAdmin(): Promise<AdminCategoryRow[]> {
  if (!isDbConfigured) return []
  const categories = await db.select().from(procedureCategory).orderBy(asc(procedureCategory.sortOrder))
  if (categories.length === 0) return []
  const procedures = await db.select({ categoryId: procedureT.categoryId }).from(procedureT).where(inArray(procedureT.categoryId, categories.map((c) => c.id)))
  const countByCategory = new Map<string, number>()
  for (const p of procedures) countByCategory.set(p.categoryId, (countByCategory.get(p.categoryId) ?? 0) + 1)
  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    descriptionAr: c.descriptionAr,
    descriptionEn: c.descriptionEn,
    icon: c.icon,
    sortOrder: c.sortOrder,
    visible: c.visible,
    procedureCount: countByCategory.get(c.id) ?? 0,
  }))
}

export type AdminProcedureRow = {
  id: string
  categoryId: string
  categoryNameAr: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  isSurgical: boolean
  recoveryDays: number | null
  visible: boolean
  sortOrder: number
}

export async function listProceduresForAdmin(): Promise<AdminProcedureRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: procedureT.id,
      categoryId: procedureT.categoryId,
      categoryNameAr: procedureCategory.nameAr,
      slug: procedureT.slug,
      nameAr: procedureT.nameAr,
      nameEn: procedureT.nameEn,
      descriptionAr: procedureT.descriptionAr,
      descriptionEn: procedureT.descriptionEn,
      isSurgical: procedureT.isSurgical,
      recoveryDays: procedureT.recoveryDays,
      visible: procedureT.visible,
      sortOrder: procedureT.sortOrder,
    })
    .from(procedureT)
    .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
    .orderBy(asc(procedureCategory.sortOrder), asc(procedureT.nameAr))
}

export type AdminUserRoleRef = { key: string; nameAr: string }
export type AdminUserRow = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  primaryRole: string
  roles: AdminUserRoleRef[]
  createdAt: Date
  lastLoginAt: Date | null
}

export async function listUsersForAdmin(opts?: { q?: string; limit?: number }): Promise<AdminUserRow[]> {
  if (!isDbConfigured) return []
  const q = opts?.q?.trim()
  const users = await db
    .select({
      id: userT.id,
      name: userT.name,
      email: userT.email,
      phone: userT.phone,
      status: userT.status,
      primaryRole: userT.role,
      createdAt: userT.createdAt,
    })
    .from(userT)
    .where(
      q
        ? or(ilike(userT.name, `%${q}%`), ilike(userT.email, `%${q}%`), ilike(userT.phone, `%${q}%`))
        : undefined,
    )
    .orderBy(desc(userT.createdAt))
    .limit(opts?.limit ?? 200)
  if (users.length === 0) return []

  const userIds = users.map((u) => u.id)
  const [roleRows, sessionRows] = await Promise.all([
    db
      .select({ userId: userRole.userId, key: roleT.key, nameAr: roleT.nameAr })
      .from(userRole)
      .innerJoin(roleT, eq(userRole.roleId, roleT.id))
      .where(inArray(userRole.userId, userIds)),
    db
      .select({ userId: sessionT.userId, createdAt: sessionT.createdAt })
      .from(sessionT)
      .where(inArray(sessionT.userId, userIds))
      .orderBy(desc(sessionT.createdAt)),
  ])

  const rolesByUser = new Map<string, AdminUserRoleRef[]>()
  for (const r of roleRows) {
    const list = rolesByUser.get(r.userId) ?? []
    if (!list.some((x) => x.key === r.key)) list.push({ key: r.key, nameAr: r.nameAr })
    rolesByUser.set(r.userId, list)
  }
  // sessionRows is already ordered desc, so the first hit per user is the latest.
  const lastLoginByUser = new Map<string, Date>()
  for (const s of sessionRows) {
    if (!lastLoginByUser.has(s.userId)) lastLoginByUser.set(s.userId, s.createdAt)
  }

  return users.map((u) => ({
    ...u,
    roles: rolesByUser.get(u.id) ?? [],
    lastLoginAt: lastLoginByUser.get(u.id) ?? null,
  }))
}

export type AdminRoleOption = { key: string; nameAr: string }

/** All assignable roles, ordered for the role-management panel. */
export async function listRolesForAdmin(): Promise<AdminRoleOption[]> {
  if (!isDbConfigured) return []
  return db
    .select({ key: roleT.key, nameAr: roleT.nameAr })
    .from(roleT)
    .orderBy(asc(roleT.nameAr))
}
