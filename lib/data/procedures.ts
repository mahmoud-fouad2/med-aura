import { and, eq, asc, ilike, or, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  doctorProcedure,
  doctorProfile,
  procedure as procedureT,
  procedureCategory,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

export type ProcedureListItem = {
  slug: string
  nameAr: string
  isSurgical: boolean
  recoveryDays: number | null
  categorySlug: string
  categoryNameAr: string
}

export type CategoryGroup = {
  slug: string
  nameAr: string
  descriptionAr: string | null
  icon: string | null
  procedures: ProcedureListItem[]
}

export async function listProceduresGrouped(): Promise<CategoryGroup[]> {
  const cats = await db
    .select({
      slug: procedureCategory.slug,
      nameAr: procedureCategory.nameAr,
      descriptionAr: procedureCategory.descriptionAr,
      icon: procedureCategory.icon,
    })
    .from(procedureCategory)
    .where(eq(procedureCategory.visible, true))
    .orderBy(asc(procedureCategory.sortOrder))

  const procs = await db
    .select({
      slug: procedureT.slug,
      nameAr: procedureT.nameAr,
      isSurgical: procedureT.isSurgical,
      recoveryDays: procedureT.recoveryDays,
      categorySlug: procedureCategory.slug,
      categoryNameAr: procedureCategory.nameAr,
    })
    .from(procedureT)
    .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
    .where(eq(procedureT.visible, true))
    .orderBy(asc(procedureT.sortOrder))

  return cats.map((c) => ({
    ...c,
    procedures: procs.filter((p) => p.categorySlug === c.slug),
  }))
}

export type ProcedureDetail = {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  descriptionEn: string | null
  isSurgical: boolean
  recoveryDays: number | null
  categorySlug: string
  categoryNameAr: string
}

export async function getProcedureBySlug(
  slug: string,
): Promise<ProcedureDetail | null> {
  const row = (
    await db
      .select({
        slug: procedureT.slug,
        nameAr: procedureT.nameAr,
        nameEn: procedureT.nameEn,
        descriptionAr: procedureT.descriptionAr,
        descriptionEn: procedureT.descriptionEn,
        isSurgical: procedureT.isSurgical,
        recoveryDays: procedureT.recoveryDays,
        categorySlug: procedureCategory.slug,
        categoryNameAr: procedureCategory.nameAr,
        visible: procedureT.visible,
      })
      .from(procedureT)
      .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
      .where(and(eq(procedureT.slug, slug), eq(procedureT.visible, true)))
      .limit(1)
  )[0]
  if (!row) return null
  const { visible: _v, ...rest } = row
  return rest
}

/* ── Mobile "services" surface (procedures + doctor availability) ──────────── */

export type ServiceListItem = {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string | null
  isSurgical: boolean
  recoveryDays: number | null
  categorySlug: string
  categoryNameAr: string
  doctorCount: number
}

/** Flat, searchable list of visible services with how many doctors offer each. */
export async function listServices(params: {
  q?: string
  category?: string
} = {}): Promise<ServiceListItem[]> {
  if (!isDbConfigured) return []
  const filters = [eq(procedureT.visible, true)]
  if (params.category) {
    filters.push(eq(procedureCategory.slug, params.category))
  }
  if (params.q?.trim()) {
    const term = `%${params.q.trim()}%`
    const like = or(
      ilike(procedureT.nameAr, term),
      ilike(procedureT.nameEn, term),
      ilike(procedureCategory.nameAr, term),
    )
    if (like) filters.push(like)
  }

  const rows = await db
    .select({
      slug: procedureT.slug,
      nameAr: procedureT.nameAr,
      nameEn: procedureT.nameEn,
      descriptionAr: procedureT.descriptionAr,
      isSurgical: procedureT.isSurgical,
      recoveryDays: procedureT.recoveryDays,
      categorySlug: procedureCategory.slug,
      categoryNameAr: procedureCategory.nameAr,
      doctorCount: sql<number>`count(distinct ${doctorProcedure.doctorId})`,
    })
    .from(procedureT)
    .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
    .leftJoin(doctorProcedure, eq(doctorProcedure.procedureId, procedureT.id))
    .where(and(...filters))
    .groupBy(
      procedureT.slug,
      procedureT.nameAr,
      procedureT.nameEn,
      procedureT.descriptionAr,
      procedureT.isSurgical,
      procedureT.recoveryDays,
      procedureCategory.slug,
      procedureCategory.nameAr,
      procedureT.sortOrder,
    )
    .orderBy(asc(procedureT.sortOrder))

  return rows.map((r) => ({ ...r, doctorCount: Number(r.doctorCount) }))
}

export type ServiceDoctor = {
  slug: string
  name: string
  title: string | null
  photoUrl: string | null
  verified: boolean
}

export type ServiceDetail = ProcedureDetail & {
  doctors: ServiceDoctor[]
}

/** Full service view + the (published) doctors who offer it. */
export async function getServiceDetail(
  slug: string,
): Promise<ServiceDetail | null> {
  const detail = await getProcedureBySlug(slug)
  if (!detail) return null

  const rows = await db
    .select({
      slug: doctorProfile.slug,
      name: doctorProfile.name,
      title: doctorProfile.title,
      photoKey: doctorProfile.photoKey,
      verified: doctorProfile.verified,
    })
    .from(doctorProcedure)
    .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
    .innerJoin(doctorProfile, eq(doctorProcedure.doctorId, doctorProfile.id))
    .where(and(eq(procedureT.slug, slug), eq(doctorProfile.published, true)))
    .limit(20)

  const doctors: ServiceDoctor[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    title: r.title,
    photoUrl: r.photoKey ? getPublicUrl(r.photoKey) : null,
    verified: r.verified,
  }))
  return { ...detail, doctors }
}
