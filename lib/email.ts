import { env, isEmailConfigured } from "./env"
import { logger } from "./logger"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Transactional email. Uses Resend when configured; otherwise logs the message
 * in development so flows (verification, reset) remain testable without keys.
 * We never pretend an email was delivered when it wasn't.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ delivered: boolean; skipped: boolean }> {
  if (!isEmailConfigured()) {
    logger.warn("email not configured — logging instead of sending", {
      to: input.to,
      subject: input.subject,
    })
    if (process.env.NODE_ENV !== "production") {
      logger.info("DEV email body", { to: input.to, html: input.html })
    }
    return { delivered: false, skipped: true }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      logger.error("email send failed", { status: res.status })
      return { delivered: false, skipped: false }
    }
    return { delivered: true, skipped: false }
  } catch (err) {
    logger.error("email send error", {
      error: err instanceof Error ? err.message : String(err),
    })
    return { delivered: false, skipped: false }
  }
}
