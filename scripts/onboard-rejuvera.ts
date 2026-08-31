import "./_load-env"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { putObjectBuffer, isR2Configured } from "@/lib/storage/r2"
import {
  role as roleT,
  userRole,
  user as userT,
  center,
  centerStaff,
  doctorProfile,
  doctorLicense,
  doctorProcedure,
  procedure as procedureT,
} from "@/lib/db/schema"
import { ROLES, type RoleKey } from "@/lib/rbac"
import { auth } from "@/lib/auth"
import { encryptString, last4 } from "@/lib/crypto"

/**
 * One-off onboarding of a real client (Rejuvera, Riyadh — rejuvera.sa) as a
 * Med Aura center, with its aesthetic-specialty doctors drawn from their own
 * public site. Deliberately NOT wired into scripts/seed.ts: this is real
 * client data, not throwaway demo/dev data, and must never be reset by a
 * reseed.
 *
 * Compliance state (explicit, by design — confirmed with the business owner):
 * each doctor's real SCFHS license number/expiry isn't public and hasn't
 * been supplied yet, so doctorLicense.status stays "PENDING" (the schema
 * default) instead of "VALID". publicDoctorConditions() requires VALID, so
 * these doctors stay invisible to patients until a real license is entered
 * through the compliance flow — same as any other pending provider. The
 * center itself is created unpublished for the same reason; flip
 * center.published + each license to VALID together once real license data
 * lands.
 */

const CENTER_SLUG = "rejuvera"
// Never hardcode a real person's email into committed source — passed at
// run time instead: REJUVERA_OWNER_EMAIL=... npx tsx scripts/onboard-rejuvera.ts
const OWNER_EMAIL: string =
  process.env.REJUVERA_OWNER_EMAIL ??
  (() => {
    throw new Error("Set REJUVERA_OWNER_EMAIL to the real center owner's email before running this script.")
  })()

async function ensureRealUser(email: string, name: string, roleKey: RoleKey): Promise<string> {
  let row = (await db.select().from(userT).where(eq(userT.email, email)).limit(1))[0]
  if (!row) {
    // Real accounts never get the shared dev password. Nobody is handed
    // this value — the owner account signs in via "forgot password" against
    // their own real inbox; the doctor placeholder accounts aren't meant to
    // log in until a real work email replaces the provider@ placeholder.
    const randomPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`
    await auth.api.signUpEmail({ body: { email, password: randomPassword, name } })
    row = (await db.select().from(userT).where(eq(userT.email, email)).limit(1))[0]
  }
  if (!row) throw new Error(`failed to create user ${email}`)

  await db
    .update(userT)
    .set({ emailVerified: email === OWNER_EMAIL, role: roleKey, isTest: false })
    .where(eq(userT.id, row.id))

  const roles = await db.select().from(roleT)
  const roleByKey = new Map(roles.map((r) => [r.key, r.id]))
  const targetRoleId = roleByKey.get(roleKey)!
  // Sign-up auto-assigns PATIENT; replace it with the real role for staff/providers.
  await db.delete(userRole).where(eq(userRole.userId, row.id))
  await db.insert(userRole).values({ userId: row.id, roleId: targetRoleId }).onConflictDoNothing()
  return row.id
}

async function mirrorPhoto(url: string, key: string): Promise<string | null> {
  if (!isR2Configured()) return null
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get("content-type") ?? "image/webp"
    await putObjectBuffer(key, buffer, contentType)
    return key
  } catch (err) {
    console.warn(`  ⚠ could not mirror photo ${url}:`, (err as Error).message)
    return null
  }
}

type DoctorInput = {
  slug: string
  name: string
  title: string
  bio: string
  languages: string[]
  yearsExperience: number
  photoUrl: string
  procedureSlugs: string[]
}

const DOCTORS: DoctorInput[] = [
  {
    slug: "loai-alsalmi",
    name: "د. لؤي السالمي",
    title: "استشاري جراحة التجميل والترميم",
    bio: "استشاري جراحة التجميل والترميم بخبرة تتجاوز 25 عامًا. يعتمد في عمله على تشخيص واضح وحدود واقعية للنتيجة قبل أي إجراء، مع خطة جراحية توازن بين السلامة الطبية ودقة التخطيط.",
    languages: ["ar", "en"],
    yearsExperience: 25,
    photoUrl:
      "https://pub-b17e8d423eac407cac34ee7a7904132f.r2.dev/doctors/11f273aa91b9f7be-image-1779016930868.webp",
    procedureSlugs: [
      "facelift",
      "neck-lift",
      "tummy-tuck",
      "liposuction",
      "brazilian-butt-lift",
      "breast-reduction",
      "breast-lift",
      "breast-augmentation",
      "arm-lift",
      "otoplasty",
      "blepharoplasty",
      "rhinoplasty",
    ],
  },
  {
    slug: "natali-domloj",
    name: "د. ناتالي دوملوج",
    title: "الجلدية والتجميل",
    bio: "طبيبة جلدية وتجميل بخبرة تتجاوز 20 عامًا. تبني توصياتها على تشخيص دقيق وخطة مدروسة تناسب طبيعة البشرة والملامح، بهدف نتيجة متوازنة وطبيعية.",
    languages: ["ar", "en", "fr"],
    yearsExperience: 20,
    photoUrl: "https://rejuvera.sa/media/doctors/natali-domloj.webp",
    procedureSlugs: ["botox", "dermal-fillers", "chemical-peel", "microneedling", "laser-hair-removal", "thread-lift"],
  },
  {
    slug: "najwa-batarfi",
    name: "د. نجوى باطرفي",
    title: "استشارية التجميل النسائي",
    bio: "استشارية التجميل النسائي بخبرة تتجاوز 15 عامًا، تركّز على فهم الحالة وتحديد الأولوية العلاجية بدقة قبل اختيار الإجراء المناسب.",
    languages: ["ar", "en"],
    yearsExperience: 15,
    photoUrl: "https://rejuvera.sa/media/doctors/najwa-batarfi.webp",
    procedureSlugs: [],
  },
  {
    slug: "dr-bayan-al-banna",
    name: "د. بيان البنا",
    title: "أخصائي أول في أمراض النساء والولادة والتجميل النسائي",
    bio: "أخصائية أول في أمراض النساء والولادة، حاصلة على البورد السعودي ودبلومة التجميل النسائي. تقدّم رعاية متكاملة للمرأة من سن البلوغ حتى مرحلة انقطاع الطمث، بخبرة تتجاوز 12 عامًا.",
    languages: ["ar", "en"],
    yearsExperience: 12,
    photoUrl:
      "https://pub-b17e8d423eac407cac34ee7a7904132f.r2.dev/doctors/04256865e386ae0e-image-1781176315565.webp",
    procedureSlugs: [],
  },
  {
    slug: "karima-jamjoom",
    name: "د. كريمة جمجوم",
    title: "أخصائية التجميل النسائي وطب النساء والولادة",
    bio: "أخصائية التجميل النسائي وطب النساء والولادة بخبرة تتجاوز 15 عامًا. تبدأ الاستشارة بالخصوصية والوضوح، ثم اختيار الخطة التي تناسب الحالة فعليًا.",
    languages: ["ar", "en"],
    yearsExperience: 15,
    photoUrl: "https://rejuvera.sa/media/doctors/karima-jamjoom.webp",
    procedureSlugs: [],
  },
  {
    slug: "ahmed-eldesouki",
    name: "د. أحمد الدسوقي",
    title: "نائب جراحة التجميل",
    bio: "طبيب جراحة تجميل بخبرة تتجاوز 7 أعوام. يرى أن النتيجة الجيدة تأتي حين تكون الخطة مناسبة للحالة ومبنية على شرح واضح قبل التنفيذ.",
    languages: ["ar", "en"],
    yearsExperience: 7,
    photoUrl: "https://rejuvera.sa/media/doctors/ahmed-eldesouki.webp",
    procedureSlugs: ["facelift", "liposuction", "tummy-tuck", "breast-augmentation"],
  },
  {
    slug: "saham-arfaj",
    name: "د. سهام العرفج",
    title: "استشارية جراحة التجميل والترميم",
    bio: "استشارية جراحة التجميل والترميم بخبرة تتجاوز 15 عامًا في التخطيط الجراحي والإجراءات الترميمية.",
    languages: ["ar", "en"],
    yearsExperience: 15,
    photoUrl: "https://rejuvera.sa/media/doctors/saham-arfaj.webp",
    procedureSlugs: ["facelift", "tummy-tuck", "liposuction", "breast-lift", "arm-lift"],
  },
  {
    slug: "maher-alahdab",
    name: "د. ماهر الأحدب",
    title: "استشاري جراحة التجميل والترميم",
    bio: "استشاري جراحة التجميل والترميم بخبرة تتجاوز 20 عامًا في جراحات التجميل والترميم.",
    languages: ["ar", "en"],
    yearsExperience: 20,
    photoUrl: "https://rejuvera.sa/media/doctors/maher-alahdab.webp",
    procedureSlugs: ["facelift", "tummy-tuck", "liposuction", "breast-augmentation", "rhinoplasty"],
  },
]

async function main() {
  console.log("Onboarding Rejuvera (rejuvera.sa) — Riyadh...")

  const ownerId = await ensureRealUser(OWNER_EMAIL, "ريجوفيرا للتجميل الطبي", ROLES.CENTER_OWNER)

  let centerRow = (await db.select().from(center).where(eq(center.slug, CENTER_SLUG)).limit(1))[0]
  if (!centerRow) {
    centerRow = (
      await db
        .insert(center)
        .values({
          ownerId,
          legalName: "مركز ريجوفيرا للتجميل الطبي",
          name: "ريجوفيرا",
          slug: CENTER_SLUG,
          description:
            "مركز طبي متخصص في جراحات التجميل والعناية المتكاملة بالبشرة في الرياض، يضم نخبة من الاستشاريين المعتمدين وأحدث الأجهزة والتقنيات ضمن بروتوكولات عيادية معتمدة.",
          country: "SA",
          city: "الرياض",
          timezone: "Asia/Riyadh",
          phone: "0114999959",
          email: OWNER_EMAIL,
          website: "https://rejuvera.sa",
          languages: ["ar", "en"],
          verified: false,
          // Unpublished until real per-doctor license data replaces the
          // PENDING placeholders below — see file header.
          published: false,
          status: "approved",
        })
        .returning()
    )[0]
    console.log(`✓ created center: ${centerRow.name} (${centerRow.id})`)
  } else {
    console.log(`= center already exists: ${centerRow.name} (${centerRow.id})`)
  }

  await db
    .insert(centerStaff)
    .values({ centerId: centerRow.id, userId: ownerId, role: "owner" })
    .onConflictDoNothing()

  const procs = await db.select().from(procedureT)
  const procBySlug = new Map(procs.map((p) => [p.slug, p.id]))

  for (const d of DOCTORS) {
    const doctorEmail = `rejuvera.${d.slug}@providers.medauraworld.com`
    const doctorUserId = await ensureRealUser(doctorEmail, d.name, ROLES.DOCTOR)

    let doc = (await db.select().from(doctorProfile).where(eq(doctorProfile.slug, d.slug)).limit(1))[0]
    if (!doc) {
      const photoKey = await mirrorPhoto(d.photoUrl, `providers/rejuvera/${d.slug}.webp`)
      doc = (
        await db
          .insert(doctorProfile)
          .values({
            userId: doctorUserId,
            centerId: centerRow.id,
            name: d.name,
            slug: d.slug,
            title: d.title,
            bio: d.bio,
            languages: d.languages,
            country: "SA",
            city: "الرياض",
            timezone: "Asia/Riyadh",
            photoKey: photoKey ?? undefined,
            yearsExperience: d.yearsExperience,
            // No fee entered yet — never a guessed number. Set from the
            // doctor/center dashboard (practice settings) once decided.
            consultationFee: null,
            currency: "SAR",
            offersVideo: false,
            offersInPerson: true,
            verified: false,
            published: false,
            status: "approved",
          })
          .returning()
      )[0]
      console.log(`  ✓ created doctor: ${doc.name} (${doc.slug})`)

      await db.insert(doctorLicense).values({
        doctorId: doc.id,
        // Placeholder — the real SCFHS license number isn't public and
        // hasn't been supplied yet. status stays PENDING (schema default),
        // which keeps this doctor out of every public listing until a real
        // number/expiry is entered and verified.
        numberEncrypted: encryptString("PENDING-VERIFICATION"),
        numberLast4: last4("PENDING"),
        issuingAuthority: "الهيئة السعودية للتخصصات الصحية (SCFHS)",
        expiryDate: "2027-01-01",
      })

      for (const slug of d.procedureSlugs) {
        const pid = procBySlug.get(slug)
        if (pid) {
          await db
            .insert(doctorProcedure)
            .values({ doctorId: doc.id, procedureId: pid, currency: "SAR" })
            .onConflictDoNothing()
        }
      }
    } else {
      console.log(`  = doctor already exists: ${doc.name} (${doc.slug})`)
    }
  }

  console.log("\nDone. Center and doctors are created but NOT published/public yet —")
  console.log("each doctor's license is PENDING (placeholder), so none of this shows")
  console.log("on the public site. Review in /admin/centers and /admin/doctors, add")
  console.log("real license numbers, set consultation fees, then publish.")
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await pool.end()
    process.exit(1)
  })
