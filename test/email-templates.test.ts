import { describe, it, expect } from "vitest"
import { twoFactorOtpEmail, verifyEmailTemplate, resetPasswordEmailTemplate } from "@/lib/email-templates"

describe("twoFactorOtpEmail", () => {
  it("embeds the code and respects the account's locale for direction and copy", () => {
    const ar = twoFactorOtpEmail({ locale: "ar", code: "482913", expiresInMinutes: 3 })
    expect(ar.html).toContain("482913")
    expect(ar.html).toContain('dir="rtl"')
    expect(ar.subject).toMatch(/رمز التحقق/)

    const en = twoFactorOtpEmail({ locale: "en", code: "482913", expiresInMinutes: 3 })
    expect(en.html).toContain("482913")
    expect(en.html).toContain('dir="ltr"')
    expect(en.subject).toMatch(/verification code/i)
  })

  it("never sends the code as a link target — code-entry only, nothing clickable carries it", () => {
    const { html } = twoFactorOtpEmail({ locale: "ar", code: "111111", expiresInMinutes: 3 })
    expect(html).not.toMatch(/href="[^"]*111111/)
  })
})

describe("verifyEmailTemplate / resetPasswordEmailTemplate", () => {
  it("carries the exact action URL through into the email", () => {
    const url = "https://medauraworld.com/api/auth/verify-email?token=abc123"
    const { html } = verifyEmailTemplate({ locale: "en", url })
    expect(html).toContain(url)
  })

  it("resetPassword email is locale-aware and links to the given url", () => {
    const url = "https://medauraworld.com/reset-password?token=xyz"
    const ar = resetPasswordEmailTemplate({ locale: "ar", url })
    expect(ar.html).toContain(url)
    expect(ar.html).toContain('dir="rtl"')
  })
})
