import { and, desc, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  favorite,
  doctorProfile,
  center,
  procedure as procedureT,
  procedureCategory,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

export type FavoriteDoctor = {
  id: string
  slug: string
  name: string
  title: string | null
  city: string | null
  country: string
  photoUrl: string | null
  favoritedAt: Date
}

export type FavoriteCenter = {
  id: string
  slug: string
  name: string
  city: string | null
  country: string
  logoUrl: string | null
  favoritedAt: Date
}

export type FavoriteProcedure = {
  id: string
  slug: string
  nameAr: string
  categoryNameAr: string
  favoritedAt: Date
}

export type FavoritesGrouped = {
  doctors: FavoriteDoctor[]
  centers: FavoriteCenter[]
  procedures: FavoriteProcedure[]
}

/** Fast set for hydrating UI heart states without extra roundtrips. */
export async function getFavoriteRefIds(
  userId: string,
): Promise<{ doctor: Set<string>; center: Set<string>; procedure: Set<string> }> {
  if (!isDbConfigured) return { doctor: new Set(), center: new Set(), procedure: new Set() }
  const rows = await db
    .select({ kind: favorite.kind, refId: favorite.refId })
    .from(favorite)
    .where(eq(favorite.userId, userId))
  const out = {
    doctor: new Set<string>(),
    center: new Set<string>(),
    procedure: new Set<string>(),
  }
  for (const r of rows) {
    if (r.kind === "doctor") out.doctor.add(r.refId)
    else if (r.kind === "center") out.center.add(r.refId)
    else if (r.kind === "procedure") out.procedure.add(r.refId)
  }
  return out
}

export async function listFavoritesForUser(
  userId: string,
): Promise<FavoritesGrouped> {
  if (!isDbConfigured) return { doctors: [], centers: [], procedures: [] }
  const rows = await db
    .select({
      kind: favorite.kind,
      refId: favorite.refId,
      createdAt: favorite.createdAt,
    })
    .from(favorite)
    .where(eq(favorite.userId, userId))
    .orderBy(desc(favorite.createdAt))

  const doctorIds = rows.filter((r) => r.kind === "doctor").map((r) => r.refId)
  const centerIds = rows.filter((r) => r.kind === "center").map((r) => r.refId)
  const procIds = rows.filter((r) => r.kind === "procedure").map((r) => r.refId)

  const [doctorRows, centerRows, procRows] = await Promise.all([
    doctorIds.length
      ? db
          .select({
            id: doctorProfile.id,
            slug: doctorProfile.slug,
            name: doctorProfile.name,
            title: doctorProfile.title,
            city: doctorProfile.city,
            country: doctorProfile.country,
            photoKey: doctorProfile.photoKey,
          })
          .from(doctorProfile)
          .where(inArray(doctorProfile.id, doctorIds))
      : Promise.resolve([]),
    centerIds.length
      ? db
          .select({
            id: center.id,
            slug: center.slug,
            name: center.name,
            city: center.city,
            country: center.country,
            logoKey: center.logoKey,
          })
          .from(center)
          .where(inArray(center.id, centerIds))
      : Promise.resolve([]),
    procIds.length
      ? db
          .select({
            id: procedureT.id,
            slug: procedureT.slug,
            nameAr: procedureT.nameAr,
            categoryNameAr: procedureCategory.nameAr,
          })
          .from(procedureT)
          .innerJoin(
            procedureCategory,
            eq(procedureT.categoryId, procedureCategory.id),
          )
          .where(inArray(procedureT.id, procIds))
      : Promise.resolve([]),
  ])

  const favoritedAt = new Map(rows.map((r) => [`${r.kind}:${r.refId}`, r.createdAt]))

  return {
    doctors: doctorRows.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      title: d.title,
      city: d.city,
      country: d.country,
      photoUrl: d.photoKey ? getPublicUrl(d.photoKey) : null,
      favoritedAt: favoritedAt.get(`doctor:${d.id}`) ?? new Date(0),
    })),
    centers: centerRows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      city: c.city,
      country: c.country,
      logoUrl: c.logoKey ? getPublicUrl(c.logoKey) : null,
      favoritedAt: favoritedAt.get(`center:${c.id}`) ?? new Date(0),
    })),
    procedures: procRows.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      categoryNameAr: p.categoryNameAr,
      favoritedAt: favoritedAt.get(`procedure:${p.id}`) ?? new Date(0),
    })),
  }
}
