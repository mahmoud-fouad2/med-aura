import { and, eq, gte, inArray, isNull, or, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { center, doctorLicense, doctorProfile, user } from "@/lib/db/schema"

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function publicCenterConditions(): SQL[] {
  const realUserIds = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.isTest, false))

  return [
    eq(center.status, "approved"),
    eq(center.verified, true),
    eq(center.published, true),
    isNull(center.deletedAt),
    or(isNull(center.ownerId), inArray(center.ownerId, realUserIds))!,
  ]
}

export function publicDoctorConditions(): SQL[] {
  const realUserIds = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.isTest, false))
  const validLicenseDoctorIds = db
    .select({ id: doctorLicense.doctorId })
    .from(doctorLicense)
    .where(
      and(
        eq(doctorLicense.status, "VALID"),
        gte(doctorLicense.expiryDate, today()),
      ),
    )
  const publicCenterIds = db
    .select({ id: center.id })
    .from(center)
    .where(and(...publicCenterConditions()))

  return [
    eq(doctorProfile.published, true),
    eq(doctorProfile.verified, true),
    eq(doctorProfile.status, "approved"),
    isNull(doctorProfile.deletedAt),
    inArray(doctorProfile.userId, realUserIds),
    inArray(doctorProfile.id, validLicenseDoctorIds),
    or(
      isNull(doctorProfile.centerId),
      inArray(doctorProfile.centerId, publicCenterIds),
    )!,
  ]
}
