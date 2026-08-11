import { listFavoritesForUser } from "@/lib/data/favorites"
import { absolutize, jsonOk, jsonServerError, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** The signed-in user's favourited doctors, newest first. Centers and
 *  procedures are stored in the same table but the app surfaces doctors
 *  only for now. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  try {
    const { doctors } = await listFavoritesForUser(auth.user.id)
    return jsonOk({
      doctors: doctors.map((d) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        title: d.title,
        city: d.city,
        country: d.country,
        photoUrl: absolutize(d.photoUrl),
      })),
    })
  } catch (err) {
    return jsonServerError("mobile.favorites", err)
  }
}
