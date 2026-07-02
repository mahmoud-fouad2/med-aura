import { asc, desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { country as countryT, city as cityT, procedureCategory, procedure as procedureT, user as userT, userRole, role as roleT } from "@/lib/db/schema"

export type AdminCountryRow = { id: string; code: string; nameAr: string; active: boolean; cityCount: number }

export async function listCountriesForAdmin(): Promise<AdminCountryRow[]> {
  if (!isDbConfigured) return []
  const countries = await db.select().from(countryT).orderBy(asc(countryT.sortOrder))
  if (countries.length === 0) return []
  const cities = await db.select({ countryId: cityT.countryId }).from(cityT).where(inArray(cityT.countryId, countries.map((c) => c.id)))
  const countByCountry = new Map<string, number>()
  for (const c of cities) countByCountry.set(c.countryId, (countByCountry.get(c.countryId) ?? 0) + 1)
  return countries.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, active: c.active, cityCount: countByCountry.get(c.id) ?? 0 }))
}

export type AdminCityRow = { id: string; nameAr: string; countryNameAr: string; active: boolean }

export async function listCitiesForAdmin(): Promise<AdminCityRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({ id: cityT.id, nameAr: cityT.nameAr, countryNameAr: countryT.nameAr, active: cityT.active })
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

export type AdminUserRow = { id: string; name: string; email: string; primaryRole: string; roles: string[]; createdAt: Date }

export async function listUsersForAdmin(limit = 200): Promise<AdminUserRow[]> {
  if (!isDbConfigured) return []
  const users = await db
    .select({ id: userT.id, name: userT.name, email: userT.email, primaryRole: userT.role, createdAt: userT.createdAt })
    .from(userT)
    .orderBy(desc(userT.createdAt))
    .limit(limit)
  if (users.length === 0) return []

  const roleRows = await db
    .select({ userId: userRole.userId, roleName: roleT.nameAr })
    .from(userRole)
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
    .where(inArray(userRole.userId, users.map((u) => u.id)))
  const rolesByUser = new Map<string, string[]>()
  for (const r of roleRows) {
    const list = rolesByUser.get(r.userId) ?? []
    list.push(r.roleName)
    rolesByUser.set(r.userId, list)
  }

  return users.map((u) => ({ ...u, roles: rolesByUser.get(u.id) ?? [] }))
}
