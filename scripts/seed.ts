import "./_load-env"
import { eq, and } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import {
  role as roleT,
  permission as permT,
  rolePermission,
  userRole,
  user as userT,
  country as countryT,
  city as cityT,
  procedureCategory,
  procedure as procedureT,
  center,
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  availabilityRule,
  providerApplication,
} from "@/lib/db/schema"
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, type RoleKey } from "@/lib/rbac"
import { auth } from "@/lib/auth"
import { encryptString, last4 } from "@/lib/crypto"

const DEV_PASSWORD = "MedAura#2026"

const ROLE_NAMES: Record<RoleKey, { ar: string; en: string }> = {
  patient: { ar: "مريض", en: "Patient" },
  doctor: { ar: "طبيب", en: "Doctor" },
  center_owner: { ar: "مالك مركز", en: "Center owner" },
  center_admin: { ar: "مدير مركز", en: "Center admin" },
  center_staff: { ar: "موظف مركز", en: "Center staff" },
  concierge: { ar: "منسق رحلة", en: "Concierge" },
  compliance_reviewer: { ar: "مراجع اعتماد", en: "Compliance reviewer" },
  finance_admin: { ar: "مسؤول مالي", en: "Finance admin" },
  support_agent: { ar: "دعم", en: "Support agent" },
  content_admin: { ar: "مسؤول محتوى", en: "Content admin" },
  super_admin: { ar: "مدير النظام", en: "Super admin" },
}

async function seedRolesAndPermissions() {
  // permissions
  const permKeys = Object.values(PERMISSIONS)
  for (const key of permKeys) {
    await db.insert(permT).values({ key }).onConflictDoNothing()
  }
  // roles
  for (const key of Object.values(ROLES) as RoleKey[]) {
    await db
      .insert(roleT)
      .values({ key, nameAr: ROLE_NAMES[key].ar, nameEn: ROLE_NAMES[key].en })
      .onConflictDoNothing()
  }
  // role_permission (super_admin gets all)
  const allPerms = await db.select().from(permT)
  const permByKey = new Map(allPerms.map((p) => [p.key, p.id]))
  const allRoles = await db.select().from(roleT)
  const roleByKey = new Map(allRoles.map((r) => [r.key, r.id]))

  for (const roleKey of Object.values(ROLES) as RoleKey[]) {
    const roleId = roleByKey.get(roleKey)!
    const perms =
      roleKey === ROLES.SUPER_ADMIN
        ? permKeys
        : ROLE_PERMISSIONS[roleKey] ?? []
    for (const pk of perms) {
      const permId = permByKey.get(pk)
      if (!permId) continue
      await db
        .insert(rolePermission)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing()
    }
  }
  console.log(`✓ roles (${allRoles.length}) + permissions (${allPerms.length})`)
}

async function seedGeography() {
  const countries = [
    { code: "SA", nameAr: "السعودية", nameEn: "Saudi Arabia", sortOrder: 1 },
    { code: "AE", nameAr: "الإمارات", nameEn: "United Arab Emirates", sortOrder: 2 },
    { code: "TR", nameAr: "تركيا", nameEn: "Türkiye", sortOrder: 3 },
    { code: "EG", nameAr: "مصر", nameEn: "Egypt", sortOrder: 4 },
  ]
  for (const c of countries) {
    await db.insert(countryT).values(c).onConflictDoNothing()
  }
  const all = await db.select().from(countryT)
  const byCode = new Map(all.map((c) => [c.code, c.id]))
  const cities = [
    { countryId: byCode.get("SA")!, nameAr: "الرياض", nameEn: "Riyadh" },
    { countryId: byCode.get("SA")!, nameAr: "جدة", nameEn: "Jeddah" },
    { countryId: byCode.get("AE")!, nameAr: "دبي", nameEn: "Dubai" },
    { countryId: byCode.get("TR")!, nameAr: "إسطنبول", nameEn: "Istanbul" },
  ]
  for (const c of cities) {
    const exists = await db
      .select({ id: cityT.id })
      .from(cityT)
      .where(and(eq(cityT.countryId, c.countryId), eq(cityT.nameEn, c.nameEn)))
      .limit(1)
    if (!exists[0]) await db.insert(cityT).values(c)
  }
  console.log(`✓ countries (${countries.length}) + cities (${cities.length})`)
}

async function seedCatalog() {
  const categories = [
    { slug: "face-neck", nameAr: "الوجه والرقبة", nameEn: "Face & Neck", icon: "smile", sortOrder: 1 },
    { slug: "breast", nameAr: "الثدي", nameEn: "Breast", icon: "ribbon", sortOrder: 2 },
    { slug: "body", nameAr: "الجسم", nameEn: "Body", icon: "activity", sortOrder: 3 },
    { slug: "skin", nameAr: "البشرة والإجراءات غير الجراحية", nameEn: "Skin & Non-surgical", icon: "sparkles", sortOrder: 4 },
    { slug: "hair", nameAr: "الشعر", nameEn: "Hair", icon: "scissors", sortOrder: 5 },
  ]
  for (const c of categories) {
    await db.insert(procedureCategory).values(c).onConflictDoNothing()
  }
  const cats = await db.select().from(procedureCategory)
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]))

  const procedures = [
    { slug: "rhinoplasty", cat: "face-neck", nameAr: "تجميل الأنف", nameEn: "Rhinoplasty", isSurgical: true, recoveryDays: 14 },
    { slug: "facelift", cat: "face-neck", nameAr: "شد الوجه", nameEn: "Facelift", isSurgical: true, recoveryDays: 21 },
    { slug: "blepharoplasty", cat: "face-neck", nameAr: "شد الجفون", nameEn: "Eyelid surgery", isSurgical: true, recoveryDays: 10 },
    { slug: "breast-augmentation", cat: "breast", nameAr: "تكبير الثدي", nameEn: "Breast augmentation", isSurgical: true, recoveryDays: 21 },
    { slug: "liposuction", cat: "body", nameAr: "شفط الدهون", nameEn: "Liposuction", isSurgical: true, recoveryDays: 14 },
    { slug: "tummy-tuck", cat: "body", nameAr: "شد البطن", nameEn: "Tummy tuck", isSurgical: true, recoveryDays: 28 },
    { slug: "botox", cat: "skin", nameAr: "البوتوكس", nameEn: "Botox", isSurgical: false, recoveryDays: 0 },
    { slug: "dermal-fillers", cat: "skin", nameAr: "الفيلر", nameEn: "Dermal fillers", isSurgical: false, recoveryDays: 0 },
    { slug: "hair-transplant", cat: "hair", nameAr: "زراعة الشعر", nameEn: "Hair transplant", isSurgical: true, recoveryDays: 10 },
  ]
  for (const p of procedures) {
    await db
      .insert(procedureT)
      .values({
        slug: p.slug,
        categoryId: catBySlug.get(p.cat)!,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        isSurgical: p.isSurgical,
        recoveryDays: p.recoveryDays,
        requiredConsultation: "VIDEO_CONSULTATION",
      })
      .onConflictDoNothing()
  }
  console.log(`✓ categories (${categories.length}) + procedures (${procedures.length})`)
}

/** Create a user via Better Auth (so password hashing matches), then set role. */
async function ensureUser(
  email: string,
  name: string,
  roleKey: RoleKey,
): Promise<string> {
  let row = (
    await db.select().from(userT).where(eq(userT.email, email)).limit(1)
  )[0]

  if (!row) {
    try {
      await auth.api.signUpEmail({
        body: { email, password: DEV_PASSWORD, name },
      })
    } catch (err) {
      console.warn(`  signup for ${email} threw (continuing):`, (err as Error).message)
    }
    row = (
      await db.select().from(userT).where(eq(userT.email, email)).limit(1)
    )[0]
  }
  if (!row) throw new Error(`failed to create user ${email}`)

  // mark email verified for dev convenience
  await db
    .update(userT)
    .set({ emailVerified: true, role: roleKey })
    .where(eq(userT.id, row.id))

  const roles = await db.select().from(roleT)
  const roleByKey = new Map(roles.map((r) => [r.key, r.id]))
  const targetRoleId = roleByKey.get(roleKey)!
  const patientRoleId = roleByKey.get(ROLES.PATIENT)!

  if (roleKey !== ROLES.PATIENT) {
    // remove the auto-assigned patient role for staff/providers
    await db
      .delete(userRole)
      .where(and(eq(userRole.userId, row.id), eq(userRole.roleId, patientRoleId)))
  }
  await db
    .insert(userRole)
    .values({ userId: row.id, roleId: targetRoleId })
    .onConflictDoNothing()

  return row.id
}

async function seedUsersAndProviders() {
  const adminId = await ensureUser("admin@medaura.local", "مدير النظام", ROLES.SUPER_ADMIN)
  const complianceId = await ensureUser(
    "compliance@medaura.local",
    "مراجع الاعتماد",
    ROLES.COMPLIANCE_REVIEWER,
  )
  await ensureUser("patient@medaura.local", "مريم المريضة", ROLES.PATIENT)
  const approvedDoctorId = await ensureUser(
    "doctor@medaura.local",
    "د. سارة العتيبي",
    ROLES.DOCTOR,
  )
  const pendingDoctorId = await ensureUser(
    "pending-doctor@medaura.local",
    "د. ليان الحربي",
    ROLES.PATIENT, // still patient until approved
  )
  console.log("✓ users (admin, compliance, patient, approved doctor, pending doctor)")

  // ── Approved center ──────────────────────────────────────────────────────
  const centerSlug = "noor-aesthetic-center"
  let centerRow = (
    await db.select().from(center).where(eq(center.slug, centerSlug)).limit(1)
  )[0]
  if (!centerRow) {
    centerRow = (
      await db
        .insert(center)
        .values({
          ownerId: approvedDoctorId,
          legalName: "مركز نور للطب التجميلي",
          name: "مركز نور للتجميل",
          slug: centerSlug,
          description: "مركز متخصص في جراحات وإجراءات التجميل، معتمد ومرخّص.",
          country: "SA",
          city: "الرياض",
          languages: ["ar", "en"],
          verified: true,
          published: true,
          status: "approved",
        })
        .returning()
    )[0]
  }

  // ── Approved, published doctor with a VALID license ──────────────────────
  const doctorSlug = "dr-sara-alotaibi"
  let doc = (
    await db
      .select()
      .from(doctorProfile)
      .where(eq(doctorProfile.slug, doctorSlug))
      .limit(1)
  )[0]
  if (!doc) {
    doc = (
      await db
        .insert(doctorProfile)
        .values({
          userId: approvedDoctorId,
          centerId: centerRow.id,
          name: "د. سارة العتيبي",
          slug: doctorSlug,
          title: "استشارية جراحة تجميل",
          bio: "استشارية جراحة تجميل بخبرة واسعة في تجميل الأنف والوجه.",
          languages: ["ar", "en"],
          country: "SA",
          city: "الرياض",
          yearsExperience: 12,
          consultationFee: "300.00",
          currency: "SAR",
          offersVideo: true,
          offersInPerson: true,
          verified: true,
          published: true,
          status: "approved",
        })
        .returning()
    )[0]

    const licenseNumber = "SA-PLS-44821"
    await db.insert(doctorLicense).values({
      doctorId: doc.id,
      numberEncrypted: encryptString(licenseNumber),
      numberLast4: last4(licenseNumber),
      issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
      issueDate: "2019-01-01",
      expiryDate: "2030-12-31", // valid (future)
      status: "VALID",
      lastVerifiedAt: new Date(),
    })

    // link to rhinoplasty + a couple more
    const procs = await db.select().from(procedureT)
    const procBySlug = new Map(procs.map((p) => [p.slug, p.id]))
    for (const slug of ["rhinoplasty", "facelift", "botox"]) {
      const pid = procBySlug.get(slug)
      if (pid)
        await db
          .insert(doctorProcedure)
          .values({ doctorId: doc.id, procedureId: pid, priceFrom: "12000.00", currency: "SAR" })
          .onConflictDoNothing()
    }

    // availability: Sun–Thu 10:00–14:00, 30-min video slots
    for (let day = 0; day <= 4; day++) {
      await db.insert(availabilityRule).values({
        doctorId: doc.id,
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "14:00",
        slotMinutes: 30,
        type: "VIDEO_CONSULTATION",
        active: true,
      })
    }
  }

  // ── Pending doctor application for compliance to review ───────────────────
  const existingApp = await db
    .select()
    .from(providerApplication)
    .where(eq(providerApplication.applicantUserId, pendingDoctorId))
    .limit(1)
  if (!existingApp[0]) {
    await db.insert(providerApplication).values({
      kind: "DOCTOR",
      applicantUserId: pendingDoctorId,
      status: "SUBMITTED",
      submittedAt: new Date(),
      payload: {
        name: "د. ليان الحربي",
        title: "أخصائية جلدية وتجميل",
        country: "SA",
        city: "جدة",
        yearsExperience: 6,
        languages: ["ar"],
        procedures: ["botox", "dermal-fillers"],
        license: {
          number: "SA-DERM-99102",
          issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
          expiryDate: "2031-06-30",
        },
      },
    })
  }
  console.log("✓ approved center + doctor (valid license, availability) + pending application")
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "true") {
    console.error("Refusing to seed in production. Set FORCE_SEED=true to override.")
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local.")
    process.exit(1)
  }

  console.log("Seeding Med Aura (development data)…\n")
  await seedRolesAndPermissions()
  await seedGeography()
  await seedCatalog()
  await seedUsersAndProviders()

  console.log("\n✅ Seed complete. DEMO data — for development only.")
  console.log("   Login password for all demo users:", DEV_PASSWORD)
  console.log("   • admin@medaura.local            (Super Admin)")
  console.log("   • compliance@medaura.local       (Compliance Reviewer)")
  console.log("   • patient@medaura.local          (Patient)")
  console.log("   • doctor@medaura.local           (Approved Doctor)")
  console.log("   • pending-doctor@medaura.local   (Pending application)")

  await pool.end()
}

main().catch(async (err) => {
  console.error("Seed failed:", err)
  await pool.end()
  process.exit(1)
})
