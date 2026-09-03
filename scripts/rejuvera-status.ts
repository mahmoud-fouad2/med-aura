import "./_load-env"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { center, doctorLicense, doctorProfile } from "@/lib/db/schema"

const CENTER_SLUG = "rejuvera"

async function main() {
  const centerRow = (
    await db
      .select({
        id: center.id,
        status: center.status,
        verified: center.verified,
        published: center.published,
      })
      .from(center)
      .where(eq(center.slug, CENTER_SLUG))
      .limit(1)
  )[0]

  if (!centerRow) {
    console.log("Rejuvera is not onboarded. Run pnpm db:rejuvera:onboard with REJUVERA_OWNER_EMAIL set.")
    return
  }

  const doctors = await db
    .select({
      id: doctorProfile.id,
      slug: doctorProfile.slug,
      status: doctorProfile.status,
      verified: doctorProfile.verified,
      published: doctorProfile.published,
    })
    .from(doctorProfile)
    .where(eq(doctorProfile.centerId, centerRow.id))
  const licenses = doctors.length
    ? await db
        .select({
          doctorId: doctorLicense.doctorId,
          status: doctorLicense.status,
          expiryDate: doctorLicense.expiryDate,
        })
        .from(doctorLicense)
        .where(inArray(doctorLicense.doctorId, doctors.map((doctor) => doctor.id)))
    : []
  const licenseByDoctor = new Map(licenses.map((license) => [license.doctorId, license]))
  const today = new Date().toISOString().slice(0, 10)
  const blockers = doctors.flatMap((doctor) => {
    const license = licenseByDoctor.get(doctor.id)
    const reasons: string[] = []
    if (doctor.status !== "approved") reasons.push("profile_not_approved")
    if (!doctor.verified) reasons.push("profile_not_verified")
    if (!license) reasons.push("license_missing")
    else if (license.status !== "VALID") reasons.push(`license_${license.status.toLowerCase()}`)
    else if (license.expiryDate < today) reasons.push("license_expired")
    return reasons.length ? [{ slug: doctor.slug, reasons }] : []
  })

  console.log(JSON.stringify({
    center: {
      status: centerRow.status,
      verified: centerRow.verified,
      published: centerRow.published,
    },
    doctors: {
      total: doctors.length,
      verified: doctors.filter((doctor) => doctor.verified).length,
      published: doctors.filter((doctor) => doctor.published).length,
      ready: doctors.length - blockers.length,
    },
    blockers,
  }, null, 2))
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("Rejuvera status check failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    })
    await pool.end()
    process.exit(1)
  })
