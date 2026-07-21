import { and, desc, eq, ilike, inArray, or } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { user as userT, patientProfile, doctorProfile, center as centerT, aestheticCase } from "@/lib/db/schema"

export type AdminPatientRow = {
  userId: string
  name: string
  email: string
  city: string | null
  residenceCountry: string | null
  createdAt: Date
  caseCount: number
}

export async function listPatientsForAdmin(q?: string, limit = 100): Promise<AdminPatientRow[]> {
  if (!isDbConfigured) return []
  const conditions = [eq(userT.role, "patient")]
  if (q?.trim()) {
    const term = `%${q.trim()}%`
    conditions.push(or(ilike(userT.name, term), ilike(userT.email, term))!)
  }

  const rows = await db
    .select({
      userId: userT.id,
      name: userT.name,
      email: userT.email,
      city: patientProfile.city,
      residenceCountry: patientProfile.residenceCountry,
      createdAt: userT.createdAt,
    })
    .from(userT)
    .leftJoin(patientProfile, eq(patientProfile.userId, userT.id))
    .where(and(...conditions))
    .orderBy(desc(userT.createdAt))
    .limit(limit)

  if (rows.length === 0) return []
  const caseCounts = await db
    .select({ patientUserId: aestheticCase.patientUserId })
    .from(aestheticCase)
    .where(inArray(aestheticCase.patientUserId, rows.map((r) => r.userId)))
  const countByUser = new Map<string, number>()
  for (const c of caseCounts) countByUser.set(c.patientUserId, (countByUser.get(c.patientUserId) ?? 0) + 1)

  return rows.map((r) => ({ ...r, caseCount: countByUser.get(r.userId) ?? 0 }))
}

export type AdminDoctorRow = {
  id: string
  userId: string
  name: string
  slug: string
  email: string | null
  status: string
  published: boolean
  country: string
  city: string | null
  centerName: string | null
  yearsExperience: number
  createdAt: Date
}

export async function listDoctorsForAdmin(filters: { status?: string; q?: string } = {}, limit = 100): Promise<AdminDoctorRow[]> {
  if (!isDbConfigured) return []
  const conditions = []
  if (filters.status) conditions.push(eq(doctorProfile.status, filters.status as (typeof doctorProfile.status.enumValues)[number]))
  if (filters.q?.trim()) conditions.push(ilike(doctorProfile.name, `%${filters.q.trim()}%`))

  const rows = await db
    .select({
      id: doctorProfile.id,
      userId: doctorProfile.userId,
      name: doctorProfile.name,
      slug: doctorProfile.slug,
      email: userT.email,
      status: doctorProfile.status,
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(doctorProfile.createdAt))
    .limit(limit)

  return rows
}

export type AdminCenterRow = {
  id: string
  slug: string
  name: string
  status: string
  published: boolean
  country: string
  city: string | null
  doctorCount: number
  createdAt: Date
  latitude: string | null
  longitude: string | null
}

export async function listCentersForAdmin(filters: { status?: string; q?: string } = {}, limit = 100): Promise<AdminCenterRow[]> {
  if (!isDbConfigured) return []
  const conditions = []
  if (filters.status) conditions.push(eq(centerT.status, filters.status as (typeof centerT.status.enumValues)[number]))
  if (filters.q?.trim()) conditions.push(ilike(centerT.name, `%${filters.q.trim()}%`))

  const rows = await db
    .select({
      id: centerT.id,
      slug: centerT.slug,
      name: centerT.name,
      status: centerT.status,
      published: centerT.published,
      country: centerT.country,
      city: centerT.city,
      createdAt: centerT.createdAt,
      latitude: centerT.latitude,
      longitude: centerT.longitude,
    })
    .from(centerT)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(centerT.createdAt))
    .limit(limit)

  if (rows.length === 0) return []
  const doctorRows = await db
    .select({ centerId: doctorProfile.centerId })
    .from(doctorProfile)
    .where(inArray(doctorProfile.centerId, rows.map((r) => r.id)))
  const countByCenter = new Map<string, number>()
  for (const d of doctorRows) {
    if (!d.centerId) continue
    countByCenter.set(d.centerId, (countByCenter.get(d.centerId) ?? 0) + 1)
  }

  return rows.map((r) => ({ ...r, doctorCount: countByCenter.get(r.id) ?? 0 }))
}
