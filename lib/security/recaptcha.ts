/**
 * Google reCAPTCHA v3 server-side verification.
 *
 * Env vars:
 *  - RECAPTCHA_SECRET_KEY                  (server, required to enforce)
 *  - NEXT_PUBLIC_RECAPTCHA_SITE_KEY        (client widget)
 *
 * When the secret is missing we run in "fallback" mode: verification is
 * skipped and we log a warning, so development continues without keys.
 */

const secretKey = process.env.RECAPTCHA_SECRET_KEY

export const isRecaptchaConfigured = Boolean(secretKey)

export type RecaptchaResult = {
  success: boolean
  score: number
  skipped: boolean
  reason?: string
}

const DEFAULT_THRESHOLD = 0.5

export async function verifyRecaptcha(
  token: string | undefined | null,
  expectedAction?: string,
  threshold = DEFAULT_THRESHOLD,
): Promise<RecaptchaResult> {
  if (!isRecaptchaConfigured) {
    console.warn("[v0] reCAPTCHA not configured — skipping verification (fallback mode).")
    return { success: true, score: 1, skipped: true, reason: "not_configured" }
  }

  if (!token) {
    return { success: false, score: 0, skipped: false, reason: "missing_token" }
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey as string, response: token }),
    })
    const data = (await res.json()) as {
      success: boolean
      score?: number
      action?: string
      "error-codes"?: string[]
    }

    if (!data.success) {
      return { success: false, score: 0, skipped: false, reason: data["error-codes"]?.join(",") }
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { success: false, score: data.score ?? 0, skipped: false, reason: "action_mismatch" }
    }
    const score = data.score ?? 0
    return { success: score >= threshold, score, skipped: false, reason: score < threshold ? "low_score" : undefined }
  } catch (err) {
    console.error("[v0] reCAPTCHA verification error:", err)
    return { success: false, score: 0, skipped: false, reason: "request_failed" }
  }
}
