import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patientProfile } from "@/lib/db/schema"
import { jsonOk, requireMobileUser } from "@/lib/mobile-api"

export const dynamic = "force-dynamic"

/** Session + profile snapshot the app loads right after boot/sign-in. */
export async function GET() {
  const auth = await requireMobileUser()
  if (!auth.ok) return auth.response
  const { user } = auth

  const profile = (
    await db
      .select({
        phone: patientProfile.phone,
        residenceCountry: patientProfile.residenceCountry,
        city: patientProfile.city,
        onboardingCompleted: patientProfile.onboardingCompleted,
      })
      .from(patientProfile)
      .where(eq(patientProfile.userId, user.id))
      .limit(1)
  )[0]

  return jsonOk({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: profile?.phone ?? null,
    residenceCountry: profile?.residenceCountry ?? null,
    city: profile?.city ?? null,
    profileCompleted: profile?.onboardingCompleted ?? false,
  })
}
