import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  user as userT,
  patientProfile,
  doctorProfile,
  center as centerT,
  aestheticCase,
  doctorProcedure,
  procedure as procedureT,
  procedureCategory,
  doctorLicense,
  availabilityRule,
} from "@/lib/db/schema"

export type AdminPatientRow = {
  userId: string
  name: string
  email: string
  phone: string | null
  status: string
  city: string | null
  residenceCountry: string | null
  createdAt: Date
  caseCount: number
}

const PATIENT_PAGE_SIZE = 20

export async function listPatientsForAdmin(
  q?: string,
  page = 1,
  pageSize = PATIENT_PAGE_SIZE,
): Promise<{ rows: AdminPatientRow[]; totalCount: number; totalPages: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1 }
  const conditions = [eq(userT.role, "patient")]
  if (q?.trim()) {
    const term = `%${q.trim()}%`
    conditions.push(or(ilike(userT.name, term), ilike(userT.email, term))!)
  }
  const where = and(...conditions)

  const [rows, countResult] = await Promise.all([
    db
      .select({
        userId: userT.id,
        name: userT.name,
        email: userT.email,
        phone: userT.phone,
        status: userT.status,
        city: patientProfile.city,
        residenceCountry: patientProfile.residenceCountry,
        createdAt: userT.createdAt,
      })
      .from(userT)
      .leftJoin(patientProfile, eq(patientProfile.userId, userT.id))
      .where(where)
      .orderBy(desc(userT.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(userT).where(where),
  ])
  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (rows.length === 0) return { rows: [], totalCount, totalPages }

  const caseCounts = await db
    .select({ patientUserId: aestheticCase.patientUserId })
    .from(aestheticCase)
    .where(inArray(aestheticCase.patientUserId, rows.map((r) => r.userId)))
  const countByUser = new Map<string, number>()
  for (const c of caseCounts) countByUser.set(c.patientUserId, (countByUser.get(c.patientUserId) ?? 0) + 1)

  return {
    rows: rows.map((r) => ({ ...r, caseCount: countByUser.get(r.userId) ?? 0 })),
    totalCount,
    totalPages,
  }
}

export type AdminDoctorRow = {
  id: string
  userId: string
  name: string
  slug: string
  email: string | null
  status: string
  verified: boolean
  published: boolean
  country: string
  city: string | null
  centerName: string | null
  yearsExperience: number
  createdAt: Date
}

export type AdminDoctorListFilters = { status?: string; q?: string; country?: string }

const DOCTOR_PAGE_SIZE = 20

export async function listDoctorsForAdmin(
  filters: AdminDoctorListFilters = {},
  page = 1,
  pageSize = DOCTOR_PAGE_SIZE,
): Promise<{ rows: AdminDoctorRow[]; totalCount: number; totalPages: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1 }
  const conditions: SQL[] = []
  if (filters.status) conditions.push(eq(doctorProfile.status, filters.status as (typeof doctorProfile.status.enumValues)[number]))
  if (filters.q?.trim()) conditions.push(ilike(doctorProfile.name, `%${filters.q.trim()}%`))
  if (filters.country) conditions.push(eq(doctorProfile.country, filters.country))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const baseQuery = db
    .select({
      id: doctorProfile.id,
      userId: doctorProfile.userId,
      name: doctorProfile.name,
      slug: doctorProfile.slug,
      email: userT.email,
      status: doctorProfile.status,
      verified: doctorProfile.verified,
      published: doctorProfile.published,
      country: doctorProfile.country,
      city: doctorProfile.city,
      centerName: centerT.name,
      yearsExperience: doctorProfile.yearsExperience,
      createdAt: doctorProfile.createdAt,
    })
    .from(doctorProfile)
    .innerJoin(userT, eq(doctorProfile.userId, userT.id))
    .leftJoin(centerT, eq(doctorProfile.centerId, centerT.id))

  const countQuery = db
    .select({ n: sql<number>`count(*)::int` })
    .from(doctorProfile)
    .innerJoin(userT, eq(doctorProfile.userId, userT.id))
    .leftJoin(centerT, eq(doctorProfile.centerId, centerT.id))

  const [rows, countResult] = await Promise.all([
    baseQuery.where(where).orderBy(desc(doctorProfile.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    countQuery.where(where),
  ])
  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return { rows, totalCount, totalPages }
}

export type AdminCenterRow = {
  id: string
  slug: string
  name: string
  status: string
  verified: boolean
  published: boolean
  country: string
  city: string | null
  doctorCount: number
  createdAt: Date
  latitude: string | null
  longitude: string | null
}

export type AdminCenterListFilters = { status?: string; q?: string; country?: string }

const CENTER_PAGE_SIZE = 20

export async function listCentersForAdmin(
  filters: AdminCenterListFilters = {},
  page = 1,
  pageSize = CENTER_PAGE_SIZE,
): Promise<{ rows: AdminCenterRow[]; totalCount: number; totalPages: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1 }
  const conditions: SQL[] = []
  if (filters.status) conditions.push(eq(centerT.status, filters.status as (typeof centerT.status.enumValues)[number]))
  if (filters.q?.trim()) conditions.push(ilike(centerT.name, `%${filters.q.trim()}%`))
  if (filters.country) conditions.push(eq(centerT.country, filters.country))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: centerT.id,
        slug: centerT.slug,
        name: centerT.name,
        status: centerT.status,
        verified: centerT.verified,
        published: centerT.published,
        country: centerT.country,
        city: centerT.city,
        createdAt: centerT.createdAt,
        latitude: centerT.latitude,
        longitude: centerT.longitude,
      })
      .from(centerT)
      .where(where)
      .orderBy(desc(centerT.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(centerT).where(where),
  ])
  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (rows.length === 0) return { rows: [], totalCount, totalPages }

  const doctorRows = await db
    .select({ centerId: doctorProfile.centerId })
    .from(doctorProfile)
    .where(inArray(doctorProfile.centerId, rows.map((r) => r.id)))
  const countByCenter = new Map<string, number>()
  for (const d of doctorRows) {
    if (!d.centerId) continue
    countByCenter.set(d.centerId, (countByCenter.get(d.centerId) ?? 0) + 1)
  }

  return {
    rows: rows.map((r) => ({ ...r, doctorCount: countByCenter.get(r.id) ?? 0 })),
    totalCount,
    totalPages,
  }
}

export type CenterFull = {
  id: string
  legalName: string
  name: string
  slug: string
  description: string | null
  country: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  languages: string[]
  platformCommissionRate: string
  latitude: string | null
  longitude: string | null
  published: boolean
  status: string
  createdAt: Date
}

export async function getCenterForAdmin(centerId: string): Promise<CenterFull | null> {
  if (!isDbConfigured) return null
  const row = (
    await db
      .select({
        id: centerT.id,
        legalName: centerT.legalName,
        name: centerT.name,
        slug: centerT.slug,
        description: centerT.description,
        country: centerT.country,
        city: centerT.city,
        address: centerT.address,
        phone: centerT.phone,
        email: centerT.email,
        website: centerT.website,
        languages: centerT.languages,
        platformCommissionRate: centerT.platformCommissionRate,
        latitude: centerT.latitude,
        longitude: centerT.longitude,
        published: centerT.published,
        status: centerT.status,
        createdAt: centerT.createdAt,
      })
      .from(centerT)
      .where(eq(centerT.id, centerId))
      .limit(1)
  )[0]
  return row ?? null
}

export type CenterDoctorRow = { id: string; name: string; slug: string; status: string; published: boolean }

/** Read-only roster for a center's drawer — reassigning a doctor's center happens on the doctor's own record. */
export async function listDoctorsByCenter(centerId: string): Promise<CenterDoctorRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: doctorProfile.id,
      name: doctorProfile.name,
      slug: doctorProfile.slug,
      status: doctorProfile.status,
      published: doctorProfile.published,
    })
    .from(doctorProfile)
    .where(eq(doctorProfile.centerId, centerId))
    .orderBy(desc(doctorProfile.createdAt))
}

export type DoctorFull = {
  id: string
  name: string
  title: string | null
  bio: string | null
  country: string
  city: string | null
  timezone: string
  languages: string[]
  yearsExperience: number
  consultationFee: string | null
  currency: string
  platformCommissionRate: string
  offersVideo: boolean
  offersInPerson: boolean
  centerId: string | null
  published: boolean
  status: string
  createdAt: Date
}

export async function getDoctorForAdmin(doctorId: string): Promise<DoctorFull | null> {
  if (!isDbConfigured) return null
  const row = (
    await db
      .select({
        id: doctorProfile.id,
        name: doctorProfile.name,
        title: doctorProfile.title,
        bio: doctorProfile.bio,
        country: doctorProfile.country,
        city: doctorProfile.city,
        timezone: doctorProfile.timezone,
        languages: doctorProfile.languages,
        yearsExperience: doctorProfile.yearsExperience,
        consultationFee: doctorProfile.consultationFee,
        currency: doctorProfile.currency,
        platformCommissionRate: doctorProfile.platformCommissionRate,
        offersVideo: doctorProfile.offersVideo,
        offersInPerson: doctorProfile.offersInPerson,
        centerId: doctorProfile.centerId,
        published: doctorProfile.published,
        status: doctorProfile.status,
        createdAt: doctorProfile.createdAt,
      })
      .from(doctorProfile)
      .where(eq(doctorProfile.id, doctorId))
      .limit(1)
  )[0]
  return row ?? null
}

/** id/name pairs for the doctor edit form's center-assignment select. */
export async function listCentersForSelect(): Promise<{ id: string; name: string }[]> {
  if (!isDbConfigured) return []
  return db
    .select({ id: centerT.id, name: centerT.name })
    .from(centerT)
    .where(eq(centerT.status, "approved"))
    .orderBy(centerT.name)
}

export type DoctorProcedureOption = {
  id: string
  nameAr: string
  nameEn: string
  categoryNameAr: string
  categoryNameEn: string
  assigned: boolean
  priceFrom: string | null
}

/** Full procedure catalog with this doctor's assignment + price overlaid — same "all options + current keys" shape as the role manager. */
export async function listDoctorProcedureOptions(doctorId: string): Promise<DoctorProcedureOption[]> {
  if (!isDbConfigured) return []
  const [procedures, assigned] = await Promise.all([
    db
      .select({
        id: procedureT.id,
        nameAr: procedureT.nameAr,
        nameEn: procedureT.nameEn,
        categoryNameAr: procedureCategory.nameAr,
        categoryNameEn: procedureCategory.nameEn,
      })
      .from(procedureT)
      .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
      .orderBy(procedureCategory.sortOrder, procedureT.nameAr),
    db
      .select({ procedureId: doctorProcedure.procedureId, priceFrom: doctorProcedure.priceFrom })
      .from(doctorProcedure)
      .where(eq(doctorProcedure.doctorId, doctorId)),
  ])
  const byId = new Map(assigned.map((a) => [a.procedureId, a.priceFrom]))
  return procedures.map((p) => ({
    ...p,
    assigned: byId.has(p.id),
    priceFrom: byId.get(p.id) ?? null,
  }))
}

export type DoctorLicenseInfo = {
  numberLast4: string | null
  issuingAuthority: string
  expiryDate: string
  status: string
}

export async function getDoctorLicense(doctorId: string): Promise<DoctorLicenseInfo | null> {
  if (!isDbConfigured) return null
  const row = (
    await db
      .select({
        numberLast4: doctorLicense.numberLast4,
        issuingAuthority: doctorLicense.issuingAuthority,
        expiryDate: doctorLicense.expiryDate,
        status: doctorLicense.status,
      })
      .from(doctorLicense)
      .where(eq(doctorLicense.doctorId, doctorId))
      .orderBy(desc(doctorLicense.createdAt))
      .limit(1)
  )[0]
  return row ?? null
}

export type AvailabilityRuleRow = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotMinutes: number
  type: string
  active: boolean
}

/** Read-only from the admin drawer (support/diagnostic view only); the doctor's
 *  own self-service editor at /dashboard/doctor/availability reuses this same
 *  reader — see upsertMyAvailabilityRuleAction / deleteMyAvailabilityRuleAction
 *  in lib/actions/doctor.ts for the write side. */
export async function listAvailabilityForDoctor(doctorId: string): Promise<AvailabilityRuleRow[]> {
  if (!isDbConfigured) return []
  return db
    .select({
      id: availabilityRule.id,
      dayOfWeek: availabilityRule.dayOfWeek,
      startTime: availabilityRule.startTime,
      endTime: availabilityRule.endTime,
      slotMinutes: availabilityRule.slotMinutes,
      type: availabilityRule.type,
      active: availabilityRule.active,
    })
    .from(availabilityRule)
    .where(eq(availabilityRule.doctorId, doctorId))
    .orderBy(availabilityRule.dayOfWeek, availabilityRule.startTime)
}
