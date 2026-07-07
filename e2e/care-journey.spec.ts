import { test, expect } from "@playwright/test"

/**
 * Real, DB-backed E2E (runs against a migrated + seeded database — see CI).
 * Covers the public marketplace, the visibility rule, and real patient signup.
 *
 * NOTE: the payment-gated care steps (consultation fee, deposit, final balance)
 * require a Stripe sandbox + webhooks and are validated separately; they are not
 * part of this browser E2E. See docs/audits/c7-final-audit.md.
 */

test("home page renders the Med Aura brand and hero", async ({ page }) => {
  await page.goto("/")
  // brand appears in the trust band ("لماذا Med Aura")
  await expect(page.getByText("Med Aura").first()).toBeVisible()
  // hero search form submits to /search
  await expect(page.getByRole("button", { name: /ابحث|بحث/ }).first()).toBeVisible()
  // quick-search chips are real links into /search
  await expect(
    page.getByRole("link", { name: "تجميل الأنف", exact: false }).first(),
  ).toBeVisible()
})

test("procedures page lists seeded cosmetic categories from the DB", async ({ page }) => {
  await page.goto("/procedures")
  // seeded category
  await expect(page.getByText("الوجه والرقبة").first()).toBeVisible()
  // seeded procedure
  await expect(page.getByText("تجميل الأنف").first()).toBeVisible()
})

test("search shows only the approved, valid-license doctor", async ({ page }) => {
  await page.goto("/search")
  // seeded approved doctor (approved + published + valid license)
  await expect(page.getByText("د. سارة العتيبي").first()).toBeVisible()
  // pending applicant must NOT appear (no published profile)
  await expect(page.getByText("ليان الحربي")).toHaveCount(0)
})

test("a visitor can register a patient account (real DB write)", async ({ page }) => {
  const email = `e2e+${Date.now()}@medaura.test`
  await page.goto("/sign-up")
  await page.getByLabel("الاسم الكامل").fill("مريض اختبار")
  await page.getByLabel("البريد الإلكتروني").fill(email)
  await page.getByLabel("كلمة المرور").fill("E2ePassw0rd!")
  await page.getByRole("button", { name: /أنشئ|إنشاء|تسجيل/ }).click()
  // auto sign-in → dashboard greets the patient by first name
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  await expect(page.getByText(/أهلًا/).first()).toBeVisible()
  // fresh patient sees the humane empty states, not errors
  await expect(page.getByText("لا مواعيد قادمة حاليًا").first()).toBeVisible()
})
