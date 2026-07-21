import {
  and,
  eq,
  or,
  ilike,
  inArray,
  gte,
  lte,
  isNull,
  isNotNull,
  desc,
  count,
  sql,
  type SQL,
} from "drizzle-orm"
import { db } from "@/lib/db"
import {
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  procedure as procedureT,
  procedureCategory,
  center,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"
import { haversineKm, haversineKmSql } from "@/lib/distance"

export type DoctorCard = {
  id: string
  slug: string
  name: string
  title: string | null
  country: string
  city: string | null
  yearsExperience: number
  consultationFee: string | null
  currency: string
  offersVideo: boolean
  offersInPerson: boolean
  verified: boolean
  rating: string | null
  reviewCount: number
  photoUrl: string | null
  procedures: string[]
  /** Only present when the caller sent real lat/lng AND the doctor's center
   *  has real coordinates — never a fabricated or estimated value. */
  distanceKm: number | null
}

export type SearchParams = {
  q?: string
  procedure?: string // procedure slug
  category?: string // category slug
  country?: string
  city?: string
  consultation?: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
  surgical?: "true" | "false"
  language?: string // must be one of the doctor's languages
  priceMin?: number
  priceMax?: number
  sort?: "price_low" | "price_high" | "rating" | "nearest"
  page?: number
  pageSize?: number
  /** User's real device coordinates — only sent when they opt in. */
  lat?: number
  lng?: number
  /** Only meaningful together with lat/lng; excludes doctors whose center
   *  distance can't be computed (no fallback, no fabricated inclusion). */
  radiusKm?: number
}

const DEMO_DOCTOR_PHOTOS: Record<string, string> = {
  "dr-sara-alotaibi": "/demo-doctors/dr-sara-alotaibi.jpg",
  "dr-noura-alqahtani": "/demo-doctors/dr-noura-alqahtani.jpg",
  "dr-ahmet-yilmaz": "/demo-doctors/dr-ahmet-yilmaz.jpg",
}

function doctorPhotoUrl(slug: string, photoKey: string | null): string | null {
  return (photoKey ? getPublicUrl(photoKey) : null) ?? DEMO_DOCTOR_PHOTOS[slug] ?? null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The single source of truth for which doctors are publicly visible:
 *  - status approved AND published
 *  - has at least one VALID, non-expired license
 *  - if attached to a center, that center is approved
 * Returns the SQL conditions array to AND together.
 */
function visibilityConditions(): SQL[] {
  const validLicenseIds = db
    .select({ id: doctorLicense.doctorId })
    .from(doctorLicense)
    .where(
      and(eq(doctorLicense.status, "VALID"), gte(doctorLicense.expiryDate, today())),
    )

  return [
    eq(doctorProfile.published, true),
    eq(doctorProfile.status, "approved"),
    isNull(doctorProfile.deletedAt),
    inArray(doctorProfile.id, validLicenseIds),
    // independent doctors (no center) pass; centered doctors need approved center
    or(
      isNull(doctorProfile.centerId),
      inArray(
        doctorProfile.centerId,
        db.select({ id: center.id }).from(center).where(eq(center.status, "approved")),
      ),
    )!,
  ]
}

function filterConditions(params: SearchParams): SQL[] {
  const conds: SQL[] = []
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`
    conds.push(or(ilike(doctorProfile.name, like), ilike(doctorProfile.title, like))!)
  }
  if (params.country) conds.push(eq(doctorProfile.country, params.country))
  if (params.city) conds.push(eq(doctorProfile.city, params.city))
  if (params.consultation === "VIDEO_CONSULTATION")
    conds.push(eq(doctorProfile.offersVideo, true))
  if (params.consultation === "IN_PERSON_CONSULTATION")
    conds.push(eq(doctorProfile.offersInPerson, true))
  // Language is stored as a text[] — match doctors who speak the chosen one.
  if (params.language)
    conds.push(sql`${params.language} = ANY(${doctorProfile.languages})`)
  // Price range on the consultation fee (doctors with no fee set are excluded
  // from a bounded range, which is the honest interpretation of a filter).
  if (params.priceMin != null)
    conds.push(gte(doctorProfile.consultationFee, String(params.priceMin)))
  if (params.priceMax != null)
    conds.push(lte(doctorProfile.consultationFee, String(params.priceMax)))

  // Radius only filters when we can actually compute a distance — doctors
  // whose center has no real coordinates are excluded rather than guessed in.
  if (params.lat != null && params.lng != null && params.radiusKm != null) {
    conds.push(
      sql`${haversineKmSql(center.latitude, center.longitude, params.lat, params.lng)} <= ${params.radiusKm}`,
    )
  }

  if (params.procedure || params.category || params.surgical) {
    const sub = db
      .select({ id: doctorProcedure.doctorId })
      .from(doctorProcedure)
      .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
      .innerJoin(
        procedureCategory,
        eq(procedureT.categoryId, procedureCategory.id),
      )
    const subConds: SQL[] = []
    if (params.procedure) subConds.push(eq(procedureT.slug, params.procedure))
    if (params.category) subConds.push(eq(procedureCategory.slug, params.category))
    if (params.surgical === "true") subConds.push(eq(procedureT.isSurgical, true))
    if (params.surgical === "false") subConds.push(eq(procedureT.isSurgical, false))
    conds.push(inArray(doctorProfile.id, sub.where(and(...subConds))))
  }
  return conds
}

/** Distinct filter options, computed from actually-visible doctors + catalog. */
export async function getDoctorFilterFacets(): Promise<{
  cities: string[]
  languages: string[]
  categories: { slug: string; nameAr: string }[]
  /** True only if at least one approved, visible center has real coordinates
   *  set — the app must not offer "nearest" as if it works before this. */
  hasNearestSupport: boolean
}> {
  const where = and(...visibilityConditions())

  const locatedCenters = await db
    .select({ n: count() })
    .from(center)
    .where(
      and(
        eq(center.status, "approved"),
        isNotNull(center.latitude),
        isNotNull(center.longitude),
      ),
    )
  const hasNearestSupport = (locatedCenters[0]?.n ?? 0) > 0

  const cityRows = await db
    .selectDistinct({ city: doctorProfile.city })
    .from(doctorProfile)
    .where(where)
  const cities = cityRows
    .map((r) => r.city)
    .filter((c): c is string => Boolean(c && c.trim()))
    .sort()

  // languages is text[]; unnest to get the distinct set actually in use.
  const langRows = await db.execute<{ lang: string }>(
    sql`select distinct unnest(${doctorProfile.languages}) as lang
        from ${doctorProfile} where ${where}`,
  )
  const languages = (langRows.rows ?? [])
    .map((r) => r.lang)
    .filter((l): l is string => Boolean(l && l.trim()))
    .sort()

  const categories = await db
    .select({ slug: procedureCategory.slug, nameAr: procedureCategory.nameAr })
    .from(procedureCategory)
    .where(eq(procedureCategory.visible, true))
    .orderBy(procedureCategory.sortOrder)

  return { cities, languages, categories, hasNearestSupport }
}

export async function searchDoctors(
  params: SearchParams,
): Promise<{ results: DoctorCard[]; total: number }> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12))
  const where = and(...visibilityConditions(), ...filterConditions(params))
  // sort=nearest only makes sense with real device coordinates — otherwise
  // it silently falls back to the organic ranking instead of faking order.
  const nearest =
    params.sort === "nearest" && params.lat != null && params.lng != null
      ? haversineKmSql(center.latitude, center.longitude, params.lat, params.lng)
      : null

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: doctorProfile.id,
        slug: doctorProfile.slug,
        name: doctorProfile.name,
        title: doctorProfile.title,
        country: doctorProfile.country,
        city: doctorProfile.city,
        yearsExperience: doctorProfile.yearsExperience,
        consultationFee: doctorProfile.consultationFee,
        currency: doctorProfile.currency,
        offersVideo: doctorProfile.offersVideo,
        offersInPerson: doctorProfile.offersInPerson,
        verified: doctorProfile.verified,
        rating: doctorProfile.rating,
        reviewCount: doctorProfile.reviewCount,
        photoKey: doctorProfile.photoKey,
        centerLatitude: center.latitude,
        centerLongitude: center.longitude,
      })
      .from(doctorProfile)
      .leftJoin(center, eq(doctorProfile.centerId, center.id))
      .where(where)
      // Explicit sort when asked; otherwise organic ranking (verified, then
      // experience). Nulls sort last so priced/rated/located doctors lead.
      .orderBy(
        ...(nearest
          ? [sql`${nearest} asc nulls last`]
          : params.sort === "price_low"
            ? [sql`${doctorProfile.consultationFee} asc nulls last`]
            : params.sort === "price_high"
              ? [sql`${doctorProfile.consultationFee} desc nulls last`]
              : params.sort === "rating"
                ? [sql`${doctorProfile.rating} desc nulls last`]
                : [
                    desc(doctorProfile.verified),
                    desc(doctorProfile.yearsExperience),
                  ]),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ n: count() })
      .from(doctorProfile)
      .leftJoin(center, eq(doctorProfile.centerId, center.id))
      .where(where),
  ])

  const ids = rows.map((r) => r.id)
  const procMap = new Map<string, string[]>()
  if (ids.length) {
    const procs = await db
      .select({
        doctorId: doctorProcedure.doctorId,
        nameAr: procedureT.nameAr,
      })
      .from(doctorProcedure)
      .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
      .where(inArray(doctorProcedure.doctorId, ids))
    for (const p of procs) {
      const arr = procMap.get(p.doctorId) ?? []
      arr.push(p.nameAr)
      procMap.set(p.doctorId, arr)
    }
  }

  return {
    results: rows.map(({ photoKey, centerLatitude, centerLongitude, ...r }) => ({
      ...r,
      photoUrl: doctorPhotoUrl(r.slug, photoKey),
      procedures: procMap.get(r.id) ?? [],
      // Honest distance: only computed when both the user's coordinates and
      // the doctor's center coordinates are real — never estimated.
      distanceKm:
        params.lat != null &&
        params.lng != null &&
        centerLatitude != null &&
        centerLongitude != null
          ? Math.round(
              haversineKm(
                params.lat,
                params.lng,
                Number(centerLatitude),
                Number(centerLongitude),
              ) * 10,
            ) / 10
          : null,
    })),
    total: totalRows[0]?.n ?? 0,
  }
}

export type PublicDoctor = DoctorCard & {
  bio: string | null
  languages: string[]
  centerName: string | null
  centerCity: string | null
  licenseAuthority: string | null
  licenseLast4: string | null
  lastVerifiedAt: Date | null
}

/** Full public profile by slug — only if the doctor is publicly visible. */
export async function getPublicDoctorBySlug(
  slug: string,
): Promise<PublicDoctor | null> {
  const where = and(eq(doctorProfile.slug, slug), ...visibilityConditions())
  const rows = await db
    .select({
      id: doctorProfile.id,
      slug: doctorProfile.slug,
      name: doctorProfile.name,
      title: doctorProfile.title,
      bio: doctorProfile.bio,
      languages: doctorProfile.languages,
      country: doctorProfile.country,
      city: doctorProfile.city,
      yearsExperience: doctorProfile.yearsExperience,
      consultationFee: doctorProfile.consultationFee,
      currency: doctorProfile.currency,
      offersVideo: doctorProfile.offersVideo,
      offersInPerson: doctorProfile.offersInPerson,
      verified: doctorProfile.verified,
      rating: doctorProfile.rating,
      reviewCount: doctorProfile.reviewCount,
      photoKey: doctorProfile.photoKey,
      centerName: center.name,
      centerCity: center.city,
    })
    .from(doctorProfile)
    .leftJoin(center, eq(doctorProfile.centerId, center.id))
    .where(where)
    .limit(1)

  const row = rows[0]
  if (!row) return null
  const photoUrl = doctorPhotoUrl(row.slug, row.photoKey)

  const [procs, license] = await Promise.all([
    db
      .select({ nameAr: procedureT.nameAr })
      .from(doctorProcedure)
      .innerJoin(procedureT, eq(doctorProcedure.procedureId, procedureT.id))
      .where(eq(doctorProcedure.doctorId, row.id)),
    db
      .select({
        issuingAuthority: doctorLicense.issuingAuthority,
        numberLast4: doctorLicense.numberLast4,
        lastVerifiedAt: doctorLicense.lastVerifiedAt,
      })
      .from(doctorLicense)
      .where(
        and(eq(doctorLicense.doctorId, row.id), eq(doctorLicense.status, "VALID")),
      )
      .limit(1),
  ])

  const { photoKey: _photoKey, ...publicRow } = row
  return {
    ...publicRow,
    photoUrl,
    procedures: procs.map((p) => p.nameAr),
    // The single-doctor profile page never carries the viewer's coordinates.
    distanceKm: null,
    licenseAuthority: license[0]?.issuingAuthority ?? null,
    licenseLast4: license[0]?.numberLast4 ?? null,
    lastVerifiedAt: license[0]?.lastVerifiedAt ?? null,
  }
}
