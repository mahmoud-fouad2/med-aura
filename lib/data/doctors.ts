import {
  and,
  eq,
  or,
  ilike,
  inArray,
  gte,
  isNull,
  desc,
  count,
  type SQL,
} from "drizzle-orm"
import { db, safeRead } from "@/lib/db"
import {
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  procedure as procedureT,
  procedureCategory,
  center,
} from "@/lib/db/schema"

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
  procedures: string[]
}

export type SearchParams = {
  q?: string
  procedure?: string // procedure slug
  category?: string // category slug
  country?: string
  city?: string
  consultation?: "VIDEO_CONSULTATION" | "IN_PERSON_CONSULTATION"
  surgical?: "true" | "false"
  page?: number
  pageSize?: number
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

export async function searchDoctors(
  params: SearchParams,
): Promise<{ results: DoctorCard[]; total: number }> {
  return safeRead(async () => {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 12))
  const where = and(...visibilityConditions(), ...filterConditions(params))

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
      })
      .from(doctorProfile)
      .where(where)
      // organic ranking: verified, then experience, then recency
      .orderBy(desc(doctorProfile.verified), desc(doctorProfile.yearsExperience))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(doctorProfile).where(where),
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
    results: rows.map((r) => ({ ...r, procedures: procMap.get(r.id) ?? [] })),
    total: totalRows[0]?.n ?? 0,
  }
  }, { results: [], total: 0 })
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
  return safeRead(async () => {
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
      centerName: center.name,
      centerCity: center.city,
    })
    .from(doctorProfile)
    .leftJoin(center, eq(doctorProfile.centerId, center.id))
    .where(where)
    .limit(1)

  const row = rows[0]
  if (!row) return null

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

  return {
    ...row,
    procedures: procs.map((p) => p.nameAr),
    licenseAuthority: license[0]?.issuingAuthority ?? null,
    licenseLast4: license[0]?.numberLast4 ?? null,
    lastVerifiedAt: license[0]?.lastVerifiedAt ?? null,
  }
  }, null)
}
