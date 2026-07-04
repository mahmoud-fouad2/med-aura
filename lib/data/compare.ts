import { and, eq, inArray } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { doctorProfile, center } from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

export type DoctorCompareRow = {
  id: string
  slug: string
  name: string
  title: string | null
  bio: string | null
  country: string
  city: string | null
  languages: string[]
  yearsExperience: number
  consultationFee: string | null
  currency: string
  offersVideo: boolean
  offersInPerson: boolean
  photoUrl: string | null
  rating: string | null
  reviewCount: number
}

/**
 * Fetch a subset of doctors for side-by-side comparison. Only approved +
 * published doctors are returned — an unapproved id is silently dropped so
 * the UI never leaks "this doctor exists but isn't public yet".
 */
export async function getDoctorsForCompare(
  ids: string[],
): Promise<DoctorCompareRow[]> {
  if (!isDbConfigured || ids.length === 0) return []
  const trimmed = ids.slice(0, 4)
  const rows = await db
    .select({
      id: doctorProfile.id,
      slug: doctorProfile.slug,
      name: doctorProfile.name,
      title: doctorProfile.title,
      bio: doctorProfile.bio,
      country: doctorProfile.country,
      city: doctorProfile.city,
      languages: doctorProfile.languages,
      yearsExperience: doctorProfile.yearsExperience,
      consultationFee: doctorProfile.consultationFee,
      currency: doctorProfile.currency,
      offersVideo: doctorProfile.offersVideo,
      offersInPerson: doctorProfile.offersInPerson,
      photoKey: doctorProfile.photoKey,
      rating: doctorProfile.rating,
      reviewCount: doctorProfile.reviewCount,
    })
    .from(doctorProfile)
    .where(
      and(
        inArray(doctorProfile.id, trimmed),
        eq(doctorProfile.published, true),
        eq(doctorProfile.status, "approved"),
      ),
    )
  // Preserve request order
  const byId = new Map(rows.map((r) => [r.id, r]))
  return trimmed
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => r != null)
    .map((r) => ({
      ...r,
      photoUrl: r.photoKey ? getPublicUrl(r.photoKey) : null,
    }))
}

export type CenterCompareRow = {
  id: string
  slug: string
  name: string
  description: string | null
  country: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  languages: string[]
  verified: boolean
  logoUrl: string | null
  rating: string | null
  reviewCount: number
}

export async function getCentersForCompare(
  ids: string[],
): Promise<CenterCompareRow[]> {
  if (!isDbConfigured || ids.length === 0) return []
  const trimmed = ids.slice(0, 4)
  const rows = await db
    .select({
      id: center.id,
      slug: center.slug,
      name: center.name,
      description: center.description,
      country: center.country,
      city: center.city,
      address: center.address,
      phone: center.phone,
      email: center.email,
      languages: center.languages,
      verified: center.verified,
      logoKey: center.logoKey,
      rating: center.rating,
      reviewCount: center.reviewCount,
    })
    .from(center)
    .where(
      and(
        inArray(center.id, trimmed),
        eq(center.published, true),
        eq(center.status, "approved"),
      ),
    )
  const byId = new Map(rows.map((r) => [r.id, r]))
  return trimmed
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => r != null)
    .map((r) => ({
      ...r,
      logoUrl: r.logoKey ? getPublicUrl(r.logoKey) : null,
    }))
}
