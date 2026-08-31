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

test("search never exposes test or pending provider accounts", async ({ page }) => {
  await page.goto("/search")
  // Demo accounts remain available for authenticated QA but never become
  // public recommendations, even when their seeded profile is approved.
  await expect(page.getByText("د. سارة العتيبي")).toHaveCount(0)
  await expect(page.getByText("د. نورة القحطاني")).toHaveCount(0)
  await expect(page.getByText("ليان الحربي")).toHaveCount(0)
})

test("a visitor can register a patient account (real DB write)", async ({ page }) => {
  const email = `e2e+${Date.now()}@medaura.test`
  await page.goto("/sign-up")
  // Step 1: the account-type choice
  await page.getByRole("button", { name: /مريضة/ }).click()
  // Step 2: the full profile form
  await page.getByLabel("الاسم الكامل").fill("مريض اختبار")
  await page.getByLabel("البريد الإلكتروني").fill(email)
  await page.getByLabel("كلمة المرور").fill("E2ePassw0rd!")
  await page.getByLabel("رقم الجوال").fill("+966501234567")
  await page.getByLabel(/دولة الإقامة/).selectOption("SA")
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: /أنشئ|إنشاء|تسجيل/ }).click()
  // auto sign-in → one-time profile wizard (see app/dashboard/page.tsx) → dashboard
  await expect(page).toHaveURL(/\/complete-profile/, { timeout: 20_000 })
  await page.getByRole("button", { name: /تخطي/ }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 })
  // dashboard greets the patient by first name
  await expect(page.getByText(/أهلاً|أهلًا/).first()).toBeVisible()
  // fresh patient sees the humane empty states, not errors
  await expect(page.getByText("لا مواعيد قادمة حاليًا").first()).toBeVisible()
})
