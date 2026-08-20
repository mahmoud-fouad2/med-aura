import { and, eq, desc, count, inArray } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { center, doctorProfile } from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"
import { demoDoctorPhoto } from "@/lib/public-media"
import {
  publicCenterConditions,
  publicDoctorConditions,
} from "@/lib/data/public-visibility"

export type CenterCard = {
  id: string
  slug: string
  name: string
  description: string | null
  country: string
  city: string | null
  verified: boolean
  doctorCount: number
  rating: string | null
  reviewCount: number
  coverUrl: string | null
}

function visibleCenter() {
  return and(...publicCenterConditions())
}

async function listPublishedCentersUncached(): Promise<CenterCard[]> {
  const rows = await db
    .select({
      id: center.id,
      slug: center.slug,
      name: center.name,
      description: center.description,
      country: center.country,
      city: center.city,
      verified: center.verified,
      rating: center.rating,
      reviewCount: center.reviewCount,
      coverKey: center.coverKey,
    })
    .from(center)
    .where(visibleCenter())
    .orderBy(desc(center.verified), desc(center.createdAt))

  if (rows.length === 0) return []

  const doctorCounts = await db
    .select({ centerId: doctorProfile.centerId, n: count() })
    .from(doctorProfile)
    .where(
      and(
        inArray(doctorProfile.centerId, rows.map((c) => c.id)),
        ...publicDoctorConditions(),
      ),
    )
    .groupBy(doctorProfile.centerId)
  const doctorCountById = new Map(doctorCounts.map((d) => [d.centerId, d.n]))

  return rows.map(({ coverKey, ...c }) => ({
    ...c,
    coverUrl: coverKey ? getPublicUrl(coverKey) : null,
    doctorCount: doctorCountById.get(c.id) ?? 0,
  }))
}

export const listPublishedCenters = unstable_cache(
  listPublishedCentersUncached,
  ["public-centers"],
  { revalidate: 60 },
)

export type CenterDetail = CenterCard & {
  address: string | null
  languages: string[]
  doctors: { slug: string; name: string; title: string | null; photoUrl: string | null }[]
}

export async function getCenterBySlug(slug: string): Promise<CenterDetail | null> {
  const c = (
    await db
      .select({
        id: center.id,
        slug: center.slug,
        name: center.name,
        description: center.description,
        country: center.country,
        city: center.city,
        address: center.address,
        languages: center.languages,
        verified: center.verified,
        rating: center.rating,
        reviewCount: center.reviewCount,
        coverKey: center.coverKey,
      })
      .from(center)
      .where(and(eq(center.slug, slug), visibleCenter()))
      .limit(1)
  )[0]
  if (!c) return null

  const docs = await db
    .select({
      slug: doctorProfile.slug,
      name: doctorProfile.name,
      title: doctorProfile.title,
      photoKey: doctorProfile.photoKey,
    })
    .from(doctorProfile)
    .where(
      and(
        eq(doctorProfile.centerId, c.id),
        ...publicDoctorConditions(),
      ),
    )

  const { coverKey, ...centerData } = c
  return {
    ...centerData,
    coverUrl: coverKey ? getPublicUrl(coverKey) : null,
    doctorCount: docs.length,
    doctors: docs.map(({ photoKey, ...d }) => ({
      ...d,
      photoUrl: (photoKey ? getPublicUrl(photoKey) : null) ?? demoDoctorPhoto(d.slug),
    })),
  }
}
