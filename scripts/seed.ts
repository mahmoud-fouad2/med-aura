import "./_load-env"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { eq, and } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { putObjectBuffer, isR2Configured } from "@/lib/storage/r2"
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
  centerStaff,
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  availabilityRule,
  providerApplication,
  faq,
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
    { code: "QA", nameAr: "قطر", nameEn: "Qatar", sortOrder: 3 },
    { code: "KW", nameAr: "الكويت", nameEn: "Kuwait", sortOrder: 4 },
    { code: "BH", nameAr: "البحرين", nameEn: "Bahrain", sortOrder: 5 },
    { code: "OM", nameAr: "عُمان", nameEn: "Oman", sortOrder: 6 },
    { code: "TR", nameAr: "تركيا", nameEn: "Türkiye", sortOrder: 7 },
    { code: "EG", nameAr: "مصر", nameEn: "Egypt", sortOrder: 8 },
    { code: "JO", nameAr: "الأردن", nameEn: "Jordan", sortOrder: 9 },
    { code: "LB", nameAr: "لبنان", nameEn: "Lebanon", sortOrder: 10 },
  ]
  for (const c of countries) {
    await db.insert(countryT).values(c).onConflictDoNothing()
  }
  const all = await db.select().from(countryT)
  const byCode = new Map(all.map((c) => [c.code, c.id]))
  const cities = [
    { countryId: byCode.get("SA")!, nameAr: "الرياض", nameEn: "Riyadh" },
    { countryId: byCode.get("SA")!, nameAr: "جدة", nameEn: "Jeddah" },
    { countryId: byCode.get("SA")!, nameAr: "الدمام", nameEn: "Dammam" },
    { countryId: byCode.get("AE")!, nameAr: "دبي", nameEn: "Dubai" },
    { countryId: byCode.get("AE")!, nameAr: "أبوظبي", nameEn: "Abu Dhabi" },
    { countryId: byCode.get("AE")!, nameAr: "الشارقة", nameEn: "Sharjah" },
    { countryId: byCode.get("QA")!, nameAr: "الدوحة", nameEn: "Doha" },
    { countryId: byCode.get("KW")!, nameAr: "مدينة الكويت", nameEn: "Kuwait City" },
    { countryId: byCode.get("BH")!, nameAr: "المنامة", nameEn: "Manama" },
    { countryId: byCode.get("OM")!, nameAr: "مسقط", nameEn: "Muscat" },
    { countryId: byCode.get("TR")!, nameAr: "إسطنبول", nameEn: "Istanbul" },
    { countryId: byCode.get("TR")!, nameAr: "أنطاليا", nameEn: "Antalya" },
    { countryId: byCode.get("EG")!, nameAr: "القاهرة", nameEn: "Cairo" },
    { countryId: byCode.get("EG")!, nameAr: "الإسكندرية", nameEn: "Alexandria" },
    { countryId: byCode.get("JO")!, nameAr: "عمّان", nameEn: "Amman" },
    { countryId: byCode.get("LB")!, nameAr: "بيروت", nameEn: "Beirut" },
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
    { slug: "face-neck", nameAr: "الوجه والرقبة", nameEn: "Face & Neck", descriptionAr: "إجراءات تجميل الوجه والرقبة بمختلف أنواعها.", icon: "Smile", sortOrder: 1 },
    { slug: "breast", nameAr: "الثدي", nameEn: "Breast", descriptionAr: "تكبير وشد وتصغير الثدي بإشراف طبي معتمد.", icon: "Gem", sortOrder: 2 },
    { slug: "body", nameAr: "الجسم", nameEn: "Body", descriptionAr: "نحت وشد الجسم وإجراءات تحسين القوام.", icon: "Activity", sortOrder: 3 },
    { slug: "skin", nameAr: "البشرة والإجراءات غير الجراحية", nameEn: "Skin & Non-surgical", descriptionAr: "بوتوكس وفيلر وعناية بالبشرة دون جراحة.", icon: "Sparkles", sortOrder: 4 },
    { slug: "hair", nameAr: "الشعر", nameEn: "Hair", descriptionAr: "زراعة الشعر وعلاجات تساقطه.", icon: "Scissors", sortOrder: 5 },
    { slug: "dental", nameAr: "الأسنان وابتسامة هوليوود", nameEn: "Dental & Smile Design", descriptionAr: "تجميل الأسنان وتصميم الابتسامة.", icon: "SmilePlus", sortOrder: 6 },
  ]
  for (const c of categories) {
    await db.insert(procedureCategory).values(c).onConflictDoNothing()
  }
  const cats = await db.select().from(procedureCategory)
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]))

  const procedures = [
    // الوجه والرقبة
    { slug: "rhinoplasty", cat: "face-neck", nameAr: "تجميل الأنف", nameEn: "Rhinoplasty", isSurgical: true, recoveryDays: 14 },
    { slug: "facelift", cat: "face-neck", nameAr: "شد الوجه", nameEn: "Facelift", isSurgical: true, recoveryDays: 21 },
    { slug: "blepharoplasty", cat: "face-neck", nameAr: "شد الجفون", nameEn: "Eyelid surgery", isSurgical: true, recoveryDays: 10 },
    { slug: "otoplasty", cat: "face-neck", nameAr: "تجميل الأذن", nameEn: "Otoplasty", isSurgical: true, recoveryDays: 7 },
    { slug: "chin-augmentation", cat: "face-neck", nameAr: "تجميل الذقن", nameEn: "Chin augmentation", isSurgical: true, recoveryDays: 10 },
    { slug: "neck-lift", cat: "face-neck", nameAr: "شد الرقبة", nameEn: "Neck lift", isSurgical: true, recoveryDays: 14 },
    { slug: "brow-lift", cat: "face-neck", nameAr: "شد الحاجب", nameEn: "Brow lift", isSurgical: true, recoveryDays: 10 },
    // الثدي
    { slug: "breast-augmentation", cat: "breast", nameAr: "تكبير الثدي", nameEn: "Breast augmentation", isSurgical: true, recoveryDays: 21 },
    { slug: "breast-lift", cat: "breast", nameAr: "شد الثدي", nameEn: "Breast lift", isSurgical: true, recoveryDays: 21 },
    { slug: "breast-reduction", cat: "breast", nameAr: "تصغير الثدي", nameEn: "Breast reduction", isSurgical: true, recoveryDays: 21 },
    // الجسم
    { slug: "liposuction", cat: "body", nameAr: "شفط الدهون", nameEn: "Liposuction", isSurgical: true, recoveryDays: 14 },
    { slug: "tummy-tuck", cat: "body", nameAr: "شد البطن", nameEn: "Tummy tuck", isSurgical: true, recoveryDays: 28 },
    { slug: "brazilian-butt-lift", cat: "body", nameAr: "شد وتكبير الأرداف", nameEn: "Brazilian butt lift", isSurgical: true, recoveryDays: 21 },
    { slug: "arm-lift", cat: "body", nameAr: "شد الذراعين", nameEn: "Arm lift", isSurgical: true, recoveryDays: 14 },
    { slug: "thigh-lift", cat: "body", nameAr: "شد الفخذين", nameEn: "Thigh lift", isSurgical: true, recoveryDays: 21 },
    { slug: "mommy-makeover", cat: "body", nameAr: "إجراء الأمومة الشامل", nameEn: "Mommy makeover", isSurgical: true, recoveryDays: 28 },
    // البشرة وغير الجراحي
    { slug: "botox", cat: "skin", nameAr: "البوتوكس", nameEn: "Botox", isSurgical: false, recoveryDays: 0 },
    { slug: "dermal-fillers", cat: "skin", nameAr: "الفيلر", nameEn: "Dermal fillers", isSurgical: false, recoveryDays: 0 },
    { slug: "chemical-peel", cat: "skin", nameAr: "التقشير الكيميائي", nameEn: "Chemical peel", isSurgical: false, recoveryDays: 3 },
    { slug: "laser-hair-removal", cat: "skin", nameAr: "إزالة الشعر بالليزر", nameEn: "Laser hair removal", isSurgical: false, recoveryDays: 0 },
    { slug: "microneedling", cat: "skin", nameAr: "الإبر الدقيقة", nameEn: "Microneedling", isSurgical: false, recoveryDays: 2 },
    { slug: "thread-lift", cat: "skin", nameAr: "شد الخيوط", nameEn: "Thread lift", isSurgical: false, recoveryDays: 5 },
    // الشعر
    { slug: "hair-transplant", cat: "hair", nameAr: "زراعة الشعر", nameEn: "Hair transplant", isSurgical: true, recoveryDays: 10 },
    { slug: "prp-hair", cat: "hair", nameAr: "حقن البلازما للشعر", nameEn: "PRP hair treatment", isSurgical: false, recoveryDays: 1 },
    // الأسنان وابتسامة هوليوود
    { slug: "veneers", cat: "dental", nameAr: "فينير الأسنان", nameEn: "Dental veneers", isSurgical: false, recoveryDays: 3 },
    { slug: "teeth-whitening", cat: "dental", nameAr: "تبييض الأسنان", nameEn: "Teeth whitening", isSurgical: false, recoveryDays: 0 },
    { slug: "smile-makeover", cat: "dental", nameAr: "تصميم الابتسامة", nameEn: "Smile makeover", isSurgical: false, recoveryDays: 5 },
  ]
  for (const [i, p] of procedures.entries()) {
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
        sortOrder: i,
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

type DemoDoctorInput = {
  email: string
  name: string
  doctorSlug: string
  title: string
  bio: string
  country: string
  city: string
  yearsExperience: number
  consultationFee: string
  currency: string
  licenseNumber: string
  centerSlug: string
  centerLegalName: string
  centerName: string
  centerDescription: string
  procedureSlugs: string[]
  /** Filename under public/demo-doctors/ — a polished local placeholder photo,
   *  superseded automatically once the doctor uploads their own. */
  photoFileName?: string
}

/**
 * Uploads a local demo-doctor placeholder photo to R2 and returns its key,
 * or null if R2 isn't configured (CI/local-without-credentials) — seeding
 * must still succeed cleanly either way, just without the photo.
 */
async function seedDemoDoctorPhoto(fileName: string): Promise<string | null> {
  const key = `demo-doctors/${fileName}`
  if (!isR2Configured()) return key
  try {
    const filePath = path.join(process.cwd(), "public", "demo-doctors", fileName)
    const buffer = await readFile(filePath)
    const contentType = fileName.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg"
    await putObjectBuffer(key, buffer, contentType)
    return key
  } catch (err) {
    console.warn(`  ⚠ could not seed demo photo ${fileName}:`, err)
    return null
  }
}

/** Idempotent: creates the doctor + their center (as owner) + license + procedures + availability. */
async function ensureApprovedDoctorWithCenter(input: DemoDoctorInput): Promise<string> {
  const doctorUserId = await ensureUser(input.email, input.name, ROLES.DOCTOR)

  const centerOwnerRole = (
    await db.select({ id: roleT.id }).from(roleT).where(eq(roleT.key, ROLES.CENTER_OWNER)).limit(1)
  )[0]
  if (centerOwnerRole) {
    await db.insert(userRole).values({ userId: doctorUserId, roleId: centerOwnerRole.id }).onConflictDoNothing()
  }

  let centerRow = (
    await db.select().from(center).where(eq(center.slug, input.centerSlug)).limit(1)
  )[0]
  if (!centerRow) {
    centerRow = (
      await db
        .insert(center)
        .values({
          ownerId: doctorUserId,
          legalName: input.centerLegalName,
          name: input.centerName,
          slug: input.centerSlug,
          description: input.centerDescription,
          country: input.country,
          city: input.city,
          languages: ["ar", "en"],
          verified: true,
          published: true,
          status: "approved",
        })
        .returning()
    )[0]
  }
  await db
    .insert(centerStaff)
    .values({ centerId: centerRow.id, userId: doctorUserId, role: "owner" })
    .onConflictDoNothing()

  let doc = (
    await db.select().from(doctorProfile).where(eq(doctorProfile.slug, input.doctorSlug)).limit(1)
  )[0]
  if (!doc) {
    doc = (
      await db
        .insert(doctorProfile)
        .values({
          userId: doctorUserId,
          centerId: centerRow.id,
          name: input.name,
          slug: input.doctorSlug,
          title: input.title,
          bio: input.bio,
          languages: ["ar", "en"],
          country: input.country,
          city: input.city,
          yearsExperience: input.yearsExperience,
          consultationFee: input.consultationFee,
          currency: input.currency,
          offersVideo: true,
          offersInPerson: true,
          verified: true,
          published: true,
          status: "approved",
        })
        .returning()
    )[0]

    await db.insert(doctorLicense).values({
      doctorId: doc.id,
      numberEncrypted: encryptString(input.licenseNumber),
      numberLast4: last4(input.licenseNumber),
      issuingAuthority: "الهيئة السعودية للتخصصات الصحية",
      issueDate: "2019-01-01",
      expiryDate: "2030-12-31", // valid (future)
      status: "VALID",
      lastVerifiedAt: new Date(),
    })

    const procs = await db.select().from(procedureT)
    const procBySlug = new Map(procs.map((p) => [p.slug, p.id]))
    for (const slug of input.procedureSlugs) {
      const pid = procBySlug.get(slug)
      if (pid)
        await db
          .insert(doctorProcedure)
          .values({ doctorId: doc.id, procedureId: pid, priceFrom: "12000.00", currency: input.currency })
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

  // Placeholder photo — never overwrites a real upload (own or reseed).
  if (input.photoFileName && !doc.photoKey) {
    const photoKey = await seedDemoDoctorPhoto(input.photoFileName)
    if (photoKey) {
      await db.update(doctorProfile).set({ photoKey }).where(eq(doctorProfile.id, doc.id))
    }
  }

  return doc.id
}

async function seedUsersAndProviders() {
  const adminId = await ensureUser("admin@medaura.local", "مدير النظام", ROLES.SUPER_ADMIN)
  const complianceId = await ensureUser(
    "compliance@medaura.local",
    "مراجع الاعتماد",
    ROLES.COMPLIANCE_REVIEWER,
  )
  await ensureUser("patient@medaura.local", "مريم المريضة", ROLES.PATIENT)

  await ensureApprovedDoctorWithCenter({
    email: "doctor@medaura.local",
    name: "د. سارة العتيبي",
    doctorSlug: "dr-sara-alotaibi",
    title: "استشارية جراحة تجميل",
    bio: "استشارية جراحة تجميل تركز على النتائج الطبيعية وخطط العلاج الواضحة، بخبرة في تجميل الأنف وشد الوجه والإجراءات غير الجراحية.",
    country: "SA",
    city: "الرياض",
    yearsExperience: 12,
    consultationFee: "300.00",
    currency: "SAR",
    licenseNumber: "SA-PLS-44821",
    centerSlug: "noor-aesthetic-center",
    centerLegalName: "مركز نور للطب التجميلي",
    centerName: "مركز نور للتجميل",
    centerDescription: "مركز عناية تجميلية حديث يجمع بين الاستشارة الدقيقة، تجهيزات آمنة، ومتابعة واضحة بعد الإجراء.",
    procedureSlugs: ["rhinoplasty", "facelift", "botox", "dermal-fillers"],
    photoFileName: "dr-sara-alotaibi-generated.png",
  })

  await ensureApprovedDoctorWithCenter({
    email: "doctor2@medaura.local",
    name: "د. نورة القحطاني",
    doctorSlug: "dr-noura-alqahtani",
    title: "استشارية جراحة تجميل الجسم",
    bio: "استشارية تجميل جسم تهتم بتوازن القوام وسلامة التعافي، مع خبرة في نحت الجسم وشد البطن وإجراءات ما بعد الولادة.",
    country: "SA",
    city: "جدة",
    yearsExperience: 9,
    consultationFee: "350.00",
    currency: "SAR",
    licenseNumber: "SA-PLS-51239",
    centerSlug: "amal-cosmetic-center",
    centerLegalName: "مركز الأمل للطب التجميلي",
    centerName: "مركز الأمل للتجميل",
    centerDescription: "مركز متخصص في جراحات نحت وشد الجسم، مع مسار متابعة منظم قبل وبعد الإجراء.",
    procedureSlugs: ["liposuction", "tummy-tuck", "breast-augmentation", "mommy-makeover"],
    photoFileName: "dr-noura-alharbi-generated.png",
  })

  await ensureApprovedDoctorWithCenter({
    email: "doctor3@medaura.local",
    name: "د. أحمد يلماز",
    doctorSlug: "dr-ahmet-yilmaz",
    title: "استشاري زراعة الشعر وتجميل الوجه",
    bio: "استشاري زراعة شعر وتجميل وجه بخبرة دولية، يقدّم تقييمًا دقيقًا وخطة علاج مفهومة قبل اتخاذ القرار.",
    country: "TR",
    city: "إسطنبول",
    yearsExperience: 15,
    consultationFee: "50.00",
    currency: "USD",
    licenseNumber: "TR-HT-88210",
    centerSlug: "istanbul-aesthetic-center",
    centerLegalName: "Istanbul Aesthetic Medical Center",
    centerName: "مركز إسطنبول للتجميل",
    centerDescription: "مركز دولي معتمد لزراعة الشعر وجراحات التجميل، مناسب للمرضى الباحثين عن رحلة علاج واضحة.",
    procedureSlugs: ["hair-transplant", "prp-hair", "rhinoplasty"],
    photoFileName: "dr-ahmed-alshammari-generated.png",
  })

  const pendingDoctorId = await ensureUser(
    "pending-doctor@medaura.local",
    "د. ليان الحربي",
    ROLES.PATIENT, // still patient until approved
  )
  console.log("✓ users (admin, compliance, patient, 3 approved doctors/centers, pending doctor)")

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

async function seedFaqs() {
  const existing = await db.select({ id: faq.id }).from(faq).limit(1)
  if (existing.length > 0) {
    console.log("✓ faqs (already seeded)")
    return
  }
  const items = [
    {
      questionAr: "ما هي منصة Med Aura؟",
      answerAr:
        "منصة متخصصة حصريًا في التجميل الطبي، تربطك بأطباء ومراكز معتمدين وتدير رحلتك من البحث والاستشارة حتى المتابعة بعد الإجراء بأمان وموثوقية.",
      category: "general",
      sortOrder: 1,
    },
    {
      questionAr: "كيف أضمن أن الطبيب معتمد؟",
      answerAr:
        "لا يظهر أي طبيب في نتائج البحث إلا بعد مراجعة فريق الاعتماد والتحقق من ترخيصه. وعند انتهاء صلاحية الترخيص يُخفى الطبيب تلقائيًا وتُمنع الحجوزات الجديدة معه.",
      category: "trust",
      sortOrder: 2,
    },
    {
      questionAr: "هل ملفاتي الطبية وصوري آمنة؟",
      answerAr:
        "نعم. تُخزَّن ملفاتك بشكل خاص وتُعرض عبر روابط مؤقتة فقط، ولا يطّلع عليها أي طبيب إلا بعد منحك إذنًا صريحًا لحالة محددة، ويمكنك سحب الإذن في أي وقت. ويُسجَّل كل اطّلاع على ملف طبي.",
      category: "privacy",
      sortOrder: 3,
    },
    {
      questionAr: "كيف تتم الاستشارة؟",
      answerAr:
        "تختار طبيبًا وموعدًا متاحًا، تنشئ حالتك وترفع صورك، تمنح الطبيب إذن الاطلاع، ثم تدفع رسوم الاستشارة. بعد تأكيد الدفع يظهر الموعد لدى الطرفين وتتم الاستشارة (فيديو أو حضوريًا).",
      category: "consultation",
      sortOrder: 4,
    },
    {
      questionAr: "متى يتم تأكيد العملية نهائيًا؟",
      answerAr:
        "لا يُعتمد الإجراء نهائيًا إلا بعد إجراء الاستشارة ومراجعة الطبيب واعتماده الطبي، وقبولك للخطة وعرض السعر، وسداد المبلغ المطلوب، وتأكيد الموعد من المركز.",
      category: "consultation",
      sortOrder: 5,
    },
    {
      questionAr: "كيف تتم المدفوعات وهل هي آمنة؟",
      answerAr:
        "تتم عبر بوابة دفع آمنة، ولا نخزّن بيانات بطاقتك إطلاقًا. ولا يُعدّ الدفع مؤكدًا إلا بعد تحقق موثوق من مزوّد الدفع.",
      category: "payments",
      sortOrder: 6,
    },
    {
      questionAr: "هل يمكنني استرجاع رسوم الاستشارة؟",
      answerAr:
        "نعم وفق سياسة الاسترجاع: الإلغاء قبل 24 ساعة يتيح استردادًا كاملًا، وتُطبَّق سياسة مقدّم الخدمة في الحالات الأخرى. راجع صفحة سياسة الاسترجاع للتفاصيل.",
      category: "payments",
      sortOrder: 7,
    },
    {
      questionAr: "أنا طبيب أو مركز تجميل، كيف أنضم؟",
      answerAr:
        "أنشئ حسابًا ثم قدّم طلب انضمام من لوحة التحكم مرفقًا بترخيصك. يراجع فريق الاعتماد الطلب، وبعد الموافقة يُنشر ملفك ويظهر للمرضى.",
      category: "providers",
      sortOrder: 8,
    },
  ]
  await db.insert(faq).values(items)
  console.log(`✓ faqs (${items.length})`)
}

/** Reference/catalog data: roles, permissions, geography, procedures, FAQs.
 *  This is REQUIRED data and is safe to run in any environment (incl. production). */
export async function seedReference(): Promise<void> {
  await seedRolesAndPermissions()
  await seedGeography()
  await seedCatalog()
  await seedFaqs()
}

/** Demo accounts/providers. NEVER run in production. */
export async function seedDemo(): Promise<void> {
  await seedUsersAndProviders()
}

export async function runSeed({ demo }: { demo: boolean }): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local.")
    process.exit(1)
  }
  // Demo data must NEVER be created in production. Reference/catalog data is
  // required and is allowed everywhere.
  if (demo && process.env.NODE_ENV === "production") {
    console.error(
      "Refusing to create DEMO data in production (NODE_ENV=production). " +
        "Use `db:seed:catalog` for reference data in production.",
    )
    process.exit(1)
  }

  console.log("Seeding Med Aura reference data…\n")
  await seedReference()

  if (demo) {
    await seedDemo()
    console.log("\n✅ Seed complete (reference + DEMO data — non-production only).")
    console.log("   Demo login password:", DEV_PASSWORD)
    console.log("   • admin@medaura.local            (Super Admin)")
    console.log("   • compliance@medaura.local       (Compliance Reviewer)")
    console.log("   • patient@medaura.local          (Patient)")
    console.log("   • doctor@medaura.local           (د. سارة العتيبي — الرياض، أنف/وجه)")
    console.log("   • doctor2@medaura.local          (د. نورة القحطاني — جدة، جسم/ثدي)")
    console.log("   • doctor3@medaura.local          (د. أحمد يلماز — إسطنبول، شعر)")
    console.log("   • pending-doctor@medaura.local   (Pending application)")
  } else {
    console.log("\n✅ Seed complete (reference/catalog data only).")
    console.log("   Demo accounts skipped. Run `db:seed:demo` (non-production) to create them.")
  }

  await pool.end()
}

// Auto-run only when this file is executed directly (`tsx scripts/seed.ts`),
// not when imported by seed-catalog.ts / seed-demo.ts.
const invoked = process.argv[1] ?? ""
if (invoked.endsWith("seed.ts") || invoked.endsWith("seed.js")) {
  runSeed({ demo: process.env.ENABLE_DEMO_DATA === "true" }).catch(async (err) => {
    console.error("Seed failed:", err)
    try {
      await pool.end()
    } catch {}
    process.exit(1)
  })
}
