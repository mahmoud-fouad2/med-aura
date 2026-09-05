import { describe, it, expect, afterAll, vi, beforeEach } from "vitest"
import { eq, inArray, and } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  user,
  center,
  doctorProfile,
  doctorLicense,
  auditLog,
} from "@/lib/db/schema"
import { setCenterVerifiedAction } from "@/lib/actions/center"
import { upsertDoctorLicenseAction, setDoctorVerifiedAction } from "@/lib/actions/doctor"
import { publicDoctorConditions } from "@/lib/data/public-visibility"
import * as sessionModule from "@/lib/session"
import * as rbacModule from "@/lib/rbac"
import { decryptString } from "@/lib/crypto"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/session")>()
  return {
    ...mod,
    requireUser: vi.fn(),
  }
})

vi.mock("@/lib/rbac", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/rbac")>()
  return {
    ...mod,
    requirePermission: vi.fn(),
  }
})

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Provider Verification & Doctor Licensing (Findings 10 & 11)", { timeout: 30000 }, () => {
  const adminUserId = rid()
  const nonAdminUserId = rid()
  const doctorUserId = rid()
  const centerOwnerId = rid()

  let centerId = ""
  let doctorId = ""

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    if (doctorId) {
      await db.delete(doctorLicense).where(eq(doctorLicense.doctorId, doctorId))
      await db.delete(doctorProfile).where(eq(doctorProfile.id, doctorId))
    }
    if (centerId) {
      await db.delete(center).where(eq(center.id, centerId))
    }
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, nonAdminUserId]))
    await db.delete(user).where(inArray(user.id, [adminUserId, nonAdminUserId, doctorUserId, centerOwnerId]))
    await pool.end()
  })

  it("manages center verification status and enforces permission checks", async () => {
    // 1. Setup admin and center owner
    await db.insert(user).values({ id: adminUserId, name: "Admin User", email: `adm-${adminUserId}@t.local`, role: "super_admin" })
    await db.insert(user).values({ id: nonAdminUserId, name: "Normal User", email: `norm-${nonAdminUserId}@t.local`, role: "patient" })
    await db.insert(user).values({ id: centerOwnerId, name: "Center Owner", email: `co-${centerOwnerId}@t.local` })

    const [c] = await db
      .insert(center)
      .values({
        legalName: "شركة النخبة الطبية",
        name: "مركز النخبة الطبي",
        slug: `center-${rid().slice(0, 8)}`,
        country: "SA",
        ownerId: centerOwnerId,
        status: "approved",
        verified: false,
        published: true,
      })
      .returning({ id: center.id })
    centerId = c.id

    // 2. Non-admin cannot verify center
    vi.mocked(sessionModule.requireUser).mockResolvedValueOnce({ id: nonAdminUserId } as any)
    vi.mocked(rbacModule.requirePermission).mockRejectedValueOnce(new Error("FORBIDDEN"))
    const nonAdminRes = await setCenterVerifiedAction({ centerId, verified: true })
    expect(nonAdminRes.ok).toBe(false)

    // 3. Admin verifies center
    vi.mocked(sessionModule.requireUser).mockResolvedValue({ id: adminUserId } as any)
    vi.mocked(rbacModule.requirePermission).mockResolvedValue(undefined as any)
    const adminVerifyRes = await setCenterVerifiedAction({ centerId, verified: true })
    expect(adminVerifyRes.ok).toBe(true)

    const [verifiedCenter] = await db.select().from(center).where(eq(center.id, centerId))
    expect(verifiedCenter.verified).toBe(true)
    expect(verifiedCenter.published).toBe(true)

    // 4. Admin un-verifies center -> published should automatically become false
    const adminUnverifyRes = await setCenterVerifiedAction({ centerId, verified: false })
    expect(adminUnverifyRes.ok).toBe(true)

    const [unverifiedCenter] = await db.select().from(center).where(eq(center.id, centerId))
    expect(unverifiedCenter.verified).toBe(false)
    expect(unverifiedCenter.published).toBe(false)

    // Re-verify and publish for next test
    await db.update(center).set({ verified: true, published: true }).where(eq(center.id, centerId))
  })

  it("upserts doctor license, encrypts license number, and auto-verifies doctor profile", async () => {
    // 1. Setup doctor user and profile
    await db.insert(user).values({ id: doctorUserId, name: "Dr Sarah Test", email: `drs-${doctorUserId}@t.local`, role: "doctor" })

    const [doc] = await db
      .insert(doctorProfile)
      .values({
        userId: doctorUserId,
        name: "Dr. Sarah",
        slug: `dr-sarah-${doctorUserId.slice(0, 8)}`,
        country: "SA",
        centerId,
        status: "approved",
        verified: false,
        published: false,
      })
      .returning({ id: doctorProfile.id })
    doctorId = doc.id

    vi.mocked(sessionModule.requireUser).mockResolvedValue({ id: adminUserId } as any)
    vi.mocked(rbacModule.requirePermission).mockResolvedValue(undefined as any)

    // 2. Add valid license
    const rawLicenseNumber = "MOH-SA-987654321"
    const expiryDate = "2030-12-31"
    const licenseRes = await upsertDoctorLicenseAction({
      doctorId,
      licenseNumber: rawLicenseNumber,
      issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
      expiryDate,
      status: "VALID",
    })
    expect(licenseRes.ok).toBe(true)

    // 3. Verify license row: encrypted number and last4
    const [lic] = await db.select().from(doctorLicense).where(eq(doctorLicense.doctorId, doctorId))
    expect(lic).toBeDefined()
    expect(lic.numberLast4).toBe("4321")
    expect(lic.numberEncrypted).not.toBe(rawLicenseNumber)
    expect(decryptString(lic.numberEncrypted)).toBe(rawLicenseNumber)
    expect(lic.status).toBe("VALID")

    // 4. Verify doctor profile was auto-verified
    const [updatedDoc] = await db.select().from(doctorProfile).where(eq(doctorProfile.id, doctorId))
    expect(updatedDoc.verified).toBe(true)

    // 5. Admin updates license to EXPIRED
    const updateRes = await upsertDoctorLicenseAction({
      doctorId,
      licenseNumber: rawLicenseNumber,
      issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
      expiryDate: "2020-01-01",
      status: "EXPIRED",
    })
    expect(updateRes.ok).toBe(true)

    const [expiredLic] = await db.select().from(doctorLicense).where(eq(doctorLicense.doctorId, doctorId))
    expect(expiredLic.status).toBe("EXPIRED")

    // Restore valid license for visibility test
    await upsertDoctorLicenseAction({
      doctorId,
      licenseNumber: rawLicenseNumber,
      issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
      expiryDate: "2032-01-01",
      status: "VALID",
    })
  })

  it("manages doctor verification toggle and reflects in public search visibility", async () => {
    vi.mocked(sessionModule.requireUser).mockResolvedValue({ id: adminUserId } as any)
    vi.mocked(rbacModule.requirePermission).mockResolvedValue(undefined as any)

    // 1. Publish doctor
    await db.update(doctorProfile).set({ published: true, verified: true }).where(eq(doctorProfile.id, doctorId))

    // 2. Query doctor via publicDoctorConditions
    const visibleDocs = await db
      .select({ id: doctorProfile.id })
      .from(doctorProfile)
      .where(and(eq(doctorProfile.id, doctorId), ...publicDoctorConditions()))
    expect(visibleDocs.length).toBe(1)
    expect(visibleDocs[0].id).toBe(doctorId)

    // 3. Admin toggles doctor verified to false -> automatically unpublishes
    const unverifyRes = await setDoctorVerifiedAction({ doctorId, verified: false })
    expect(unverifyRes.ok).toBe(true)

    const [unverifiedDoc] = await db.select().from(doctorProfile).where(eq(doctorProfile.id, doctorId))
    expect(unverifiedDoc.verified).toBe(false)
    expect(unverifiedDoc.published).toBe(false)

    // 4. Doctor is now hidden from public search
    const hiddenDocs = await db
      .select({ id: doctorProfile.id })
      .from(doctorProfile)
      .where(and(eq(doctorProfile.id, doctorId), ...publicDoctorConditions()))
    expect(hiddenDocs.length).toBe(0)
  })
})
