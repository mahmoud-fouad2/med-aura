import { expect, test } from "@playwright/test"

test("Arabic and English routes expose the correct document direction", async ({ page }) => {
  await page.goto("/ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("رحلتك")

  await page.goto("/en")
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aesthetic journey")
})

test("procedure catalog supports search and category navigation", async ({ page }) => {
  await page.goto("/ar/procedures")
  await page.getByRole("searchbox", { name: "ابحث في الإجراءات" }).fill("الأنف")
  await page.getByRole("button", { name: "بحث" }).click()
  await expect(page.getByRole("heading", { name: "تجميل الأنف" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "شد البطن" })).toHaveCount(0)
})

for (const path of ["/ar", "/ar/search", "/ar/procedures", "/ar/centers", "/ar/destinations"]) {
  test(`${path} fits a mobile viewport and its images load`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const failedImages: string[] = []
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().includes("/_next/image")) {
        failedImages.push(`${response.status()} ${response.url()}`)
      }
    })

    const response = await page.goto(path, { waitUntil: "domcontentloaded" })
    expect(response?.ok(), `${path} did not return a successful document`).toBe(true)
    await expect(page.locator("main")).toBeVisible()

    // Do not wait for global network idleness: streaming/telemetry connections
    // may stay open in production. Scroll once so lazy images enter the viewport,
    // then assert the image elements themselves have decoded successfully.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect
      .poll(async () =>
        page
          .locator("img")
          .evaluateAll((images) =>
            (images as HTMLImageElement[])
              .filter((image) => image.currentSrc && (!image.complete || image.naturalWidth === 0))
              .map((image) => image.currentSrc),
          ),
      )
      .toEqual([])

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${path} has horizontal overflow`).toBeLessThanOrEqual(1)
    expect(failedImages).toEqual([])
  })
}

test("protected workspaces redirect anonymous visitors without looping", async ({ page }) => {
  for (const path of ["/dashboard", "/admin"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/sign-in\?next=/)
    await expect(page.getByRole("heading", { name: /مرحباً بكِ مجدداً|Welcome back/ })).toBeVisible()
  }
})
