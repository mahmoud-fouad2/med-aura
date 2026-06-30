import { and, eq, desc, isNull, count } from "drizzle-orm"
import { db, safeRead } from "@/lib/db"
import { center, doctorProfile } from "@/lib/db/schema"

export type CenterCard = {
  id: string
  slug: string
  name: string
  description: string | null
  country: string
  city: string | null
  verified: boolean
  doctorCount: number
}

function visibleCenter() {
  return and(
    eq(center.status, "approved"),
    eq(center.published, true),
    isNull(center.deletedAt),
  )
}

export async function listPublishedCenters(): Promise<CenterCard[]> {
  return safeRead(async () => {
  const rows = await db
    .select({
      id: center.id,
      slug: center.slug,
      name: center.name,
      description: center.description,
      country: center.country,
      city: center.city,
      verified: center.verified,
    })
    .from(center)
    .where(visibleCenter())
    .orderBy(desc(center.verified), desc(center.createdAt))

  if (rows.length === 0) return []

  const result: CenterCard[] = []
  for (const c of rows) {
    const dc = (
      await db
        .select({ n: count() })
        .from(doctorProfile)
        .where(
          and(
            eq(doctorProfile.centerId, c.id),
            eq(doctorProfile.published, true),
            eq(doctorProfile.status, "approved"),
          ),
        )
    )[0]?.n ?? 0
    result.push({ ...c, doctorCount: dc })
  }
  return result
  }, [])
}

export type CenterDetail = CenterCard & {
  address: string | null
  languages: string[]
  doctors: { slug: string; name: string; title: string | null }[]
}

export async function getCenterBySlug(slug: string): Promise<CenterDetail | null> {
  return safeRead(async () => {
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
    })
    .from(doctorProfile)
    .where(
      and(
        eq(doctorProfile.centerId, c.id),
        eq(doctorProfile.published, true),
        eq(doctorProfile.status, "approved"),
      ),
    )

  return { ...c, doctorCount: docs.length, doctors: docs }
  }, null)
}
