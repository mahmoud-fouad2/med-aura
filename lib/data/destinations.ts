import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  country,
  city,
  center,
  doctorProfile,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

export type DestinationCard = {
  code: string
  nameAr: string
  nameEn: string
  citiesCount: number
  approvedDoctors: number
  approvedCenters: number
  languagesTop: string[]
}

/**
 * All active destinations with real aggregate counts of approved+published
 * doctors and centers. Zero-count destinations are still returned so admins
 * can see the geography catalog, but callers can filter them out.
 */
export async function listDestinations(): Promise<DestinationCard[]> {
  if (!isDbConfigured) return []
  const countries = await db
    .select({
      code: country.code,
      nameAr: country.nameAr,
      nameEn: country.nameEn,
    })
    .from(country)
    .where(eq(country.active, true))
    .orderBy(asc(country.sortOrder), asc(country.nameAr))

  if (countries.length === 0) return []
  const codes = countries.map((c) => c.code)

  const cityRows = await db
    .select({ countryId: country.id, code: country.code })
    .from(city)
    .innerJoin(country, eq(city.countryId, country.id))
    .where(and(eq(city.active, true), inArray(country.code, codes)))
  const cityByCode = new Map<string, number>()
  for (const r of cityRows) cityByCode.set(r.code, (cityByCode.get(r.code) ?? 0) + 1)

  const centerRows = await db
    .select({ country: center.country, languages: center.languages })
    .from(center)
    .where(
      and(
        eq(center.published, true),
        eq(center.status, "approved"),
        inArray(center.country, codes),
      ),
    )
  const centersByCode = new Map<string, number>()
  const langByCode = new Map<string, Map<string, number>>()
  for (const r of centerRows) {
    centersByCode.set(r.country, (centersByCode.get(r.country) ?? 0) + 1)
    const bucket = langByCode.get(r.country) ?? new Map<string, number>()
    for (const l of r.languages ?? []) bucket.set(l, (bucket.get(l) ?? 0) + 1)
    langByCode.set(r.country, bucket)
  }

  const doctorRows = await db
    .select({ country: doctorProfile.country })
    .from(doctorProfile)
    .where(
      and(
        eq(doctorProfile.published, true),
        eq(doctorProfile.status, "approved"),
        inArray(doctorProfile.country, codes),
      ),
    )
  const doctorsByCode = new Map<string, number>()
  for (const r of doctorRows)
    doctorsByCode.set(r.country, (doctorsByCode.get(r.country) ?? 0) + 1)

  return countries.map((c) => {
    const langMap = langByCode.get(c.code)
    const languagesTop = langMap
      ? [...langMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([lang]) => lang)
      : []
    return {
      code: c.code,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      citiesCount: cityByCode.get(c.code) ?? 0,
      approvedDoctors: doctorsByCode.get(c.code) ?? 0,
      approvedCenters: centersByCode.get(c.code) ?? 0,
      languagesTop,
    }
  })
}

export type DestinationDetail = {
  code: string
  nameAr: string
  nameEn: string
  cities: { id: string; nameAr: string; nameEn: string }[]
  centers: {
    id: string
    slug: string
    name: string
    city: string | null
    description: string | null
    verified: boolean
  }[]
  doctors: {
    id: string
    slug: string
    name: string
    title: string | null
    city: string | null
    yearsExperience: number
    photoUrl: string | null
  }[]
}

const DEMO_DOCTOR_PHOTOS: Record<string, string> = {
  "dr-sara-alotaibi": "/demo-doctors/dr-sara-alotaibi-generated.png",
  "dr-noura-alqahtani": "/demo-doctors/dr-noura-alharbi-generated.png",
  "dr-ahmet-yilmaz": "/demo-doctors/dr-ahmed-alshammari-generated.png",
}

export async function getDestinationBySlug(
  code: string,
): Promise<DestinationDetail | null> {
  if (!isDbConfigured) return null
  const [c] = await db
    .select({
      id: country.id,
      code: country.code,
      nameAr: country.nameAr,
      nameEn: country.nameEn,
    })
    .from(country)
    .where(and(eq(country.code, code.toUpperCase()), eq(country.active, true)))
    .limit(1)
  if (!c) return null

  const [cities, centers, doctors] = await Promise.all([
    db
      .select({ id: city.id, nameAr: city.nameAr, nameEn: city.nameEn })
      .from(city)
      .where(and(eq(city.countryId, c.id), eq(city.active, true)))
      .orderBy(asc(city.nameAr)),
    db
      .select({
        id: center.id,
        slug: center.slug,
        name: center.name,
        city: center.city,
        description: center.description,
        verified: center.verified,
      })
      .from(center)
      .where(
        and(
          eq(center.country, c.code),
          eq(center.status, "approved"),
          eq(center.published, true),
        ),
      )
      .orderBy(asc(center.name))
      .limit(24),
    db
      .select({
        id: doctorProfile.id,
        slug: doctorProfile.slug,
        name: doctorProfile.name,
        title: doctorProfile.title,
        city: doctorProfile.city,
        yearsExperience: doctorProfile.yearsExperience,
        photoKey: doctorProfile.photoKey,
      })
      .from(doctorProfile)
      .where(
        and(
          eq(doctorProfile.country, c.code),
          eq(doctorProfile.status, "approved"),
          eq(doctorProfile.published, true),
        ),
      )
      .orderBy(sql`${doctorProfile.yearsExperience} desc nulls last`)
      .limit(24),
  ])

  return {
    code: c.code,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    cities,
    centers,
    doctors: doctors.map(({ photoKey, ...d }) => ({
      ...d,
      photoUrl: (photoKey ? getPublicUrl(photoKey) : null) ?? DEMO_DOCTOR_PHOTOS[d.slug] ?? null,
    })),
  }
}
