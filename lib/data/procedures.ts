import { and, eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { procedure as procedureT, procedureCategory } from "@/lib/db/schema"

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
  procedures: ProcedureListItem[]
}

export async function listProceduresGrouped(): Promise<CategoryGroup[]> {
  const cats = await db
    .select({
      slug: procedureCategory.slug,
      nameAr: procedureCategory.nameAr,
      descriptionAr: procedureCategory.descriptionAr,
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
