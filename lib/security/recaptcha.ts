import { env, isRecaptchaConfigured } from "@/lib/env"
import { logger } from "@/lib/logger"

/**
 * Google reCAPTCHA v3 server-side verification.
 *
 * Enforced on sensitive public forms only when RECAPTCHA_SECRET_KEY is set.
 * Without it, verification is skipped (fallback) so development continues.
 */
export { isRecaptchaConfigured }

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
  if (!isRecaptchaConfigured()) {
    logger.warn("reCAPTCHA not configured — skipping verification (fallback mode)")
    return { success: true, score: 1, skipped: true, reason: "not_configured" }
  }

  if (!token) {
    return { success: false, score: 0, skipped: false, reason: "missing_token" }
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.RECAPTCHA_SECRET_KEY as string,
        response: token,
      }),
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
    return {
      success: score >= threshold,
      score,
      skipped: false,
      reason: score < threshold ? "low_score" : undefined,
    }
  } catch (err) {
    logger.error("reCAPTCHA verification error", {
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, score: 0, skipped: false, reason: "request_failed" }
  }
}
