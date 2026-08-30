import { absoluteUrl } from "@/lib/seo"
import type { Locale } from "@/lib/i18n"

/**
 * Branded transactional email shell — table-based layout with inline styles
 * throughout, since email clients (Outlook especially) ignore <style> blocks
 * and modern CSS (flexbox/grid/custom properties) entirely. Every email in
 * the app should render through this so they share one visual identity
 * instead of the bare unstyled <div> each flow used to write on its own.
 */

const BRAND = {
  primary: "#4A1D96",
  primarySoft: "#F3EEFC",
  gold: "#C9A24B",
  ink: "#1A1625",
  muted: "#6B6478",
  border: "#EAE6F2",
  cream: "#FFFCF7",
} as const

const COPY = {
  ar: {
    rights: "جميع الحقوق محفوظة",
    tagline: "رحلتك التجميلية بثقة",
    automated: "هذه رسالة تلقائية، برجاء عدم الرد عليها مباشرة.",
  },
  en: {
    rights: "All rights reserved",
    tagline: "Your aesthetic journey, trusted",
    automated: "This is an automated message — please don't reply directly.",
  },
} as const

export function emailShell({
  locale,
  previewText,
  bodyHtml,
}: {
  locale: Locale
  /** Hidden preheader text — what inboxes show next to the subject line. */
  previewText: string
  bodyHtml: string
}): string {
  const isAr = locale === "ar"
  const dir = isAr ? "rtl" : "ltr"
  const align = isAr ? "right" : "left"
  const t = COPY[locale]
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charSet="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Med Aura</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background-color:${BRAND.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellPadding="0" cellSpacing="0" style="width:480px;max-width:100%;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(74,29,150,0.08);">
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,${BRAND.primary},${BRAND.gold});font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 32px 20px;">
              <img
                src="${absoluteUrl("/brand/med-aura-horizontal.png")}"
                alt="Med Aura"
                width="150"
                style="display:block;width:150px;height:auto;"
              />
            </td>
          </tr>
          <tr>
            <td dir="${dir}" align="${align}" style="padding:0 36px 8px;color:${BRAND.ink};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 0;">
              <div style="border-top:1px solid ${BRAND.border};"></div>
            </td>
          </tr>
          <tr>
            <td dir="${dir}" align="center" style="padding:20px 36px 28px;color:${BRAND.muted};font-size:12px;line-height:1.7;">
              <div>${t.tagline} — Med Aura</div>
              <div style="margin-top:4px;">${t.automated}</div>
              <div style="margin-top:10px;color:#9C97A8;">© ${year} Med Aura. ${t.rights}.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const OTP_COPY = {
  ar: {
    subject: "رمز التحقق الخاص بك — Med Aura",
    preview: (code: string) => `رمز التحقق الخاص بك هو ${code}`,
    greeting: "مرحباً،",
    intro:
      "استخدم الرمز التالي لإتمام تسجيل الدخول إلى حسابك في Med Aura. هذا الرمز جزء من طبقة الحماية الإضافية (التحقق بخطوتين) المفعّلة على حسابك.",
    codeLabel: "رمز التحقق",
    expiry: (minutes: number) => `صالح لمدة ${minutes} دقائق من الآن.`,
    warning:
      "لم تطلب هذا الرمز؟ يمكنك تجاهل هذه الرسالة بأمان — لن يتم تسجيل الدخول بدون الوصول إلى بريدك الإلكتروني. لا تشارك هذا الرمز مع أي شخص، ولن يطلبه منك فريق Med Aura أبداً.",
  },
  en: {
    subject: "Your verification code — Med Aura",
    preview: (code: string) => `Your verification code is ${code}`,
    greeting: "Hi,",
    intro:
      "Use the code below to finish signing in to your Med Aura account. This code is part of the extra protection layer (two-factor verification) enabled on your account.",
    codeLabel: "Verification code",
    expiry: (minutes: number) => `Valid for ${minutes} minutes from now.`,
    warning:
      "Didn't request this? You can safely ignore this email — no one can sign in without access to your inbox. Never share this code with anyone; Med Aura staff will never ask for it.",
  },
} as const

/** The two-factor plugin's otpOptions.sendOTP handler renders this. */
export function twoFactorOtpEmail({
  locale,
  code,
  expiresInMinutes,
}: {
  locale: Locale
  code: string
  expiresInMinutes: number
}): { subject: string; html: string } {
  const c = OTP_COPY[locale]
  const isAr = locale === "ar"
  // Wide letter-spacing + a monospaced-leaning stack keeps digits distinct
  // and unambiguous (no serif confusion between 1/l/I) at a glance.
  const codeBlock = `
    <div style="margin:22px 0;padding:18px 16px;background-color:${BRAND.primarySoft};border:1px solid ${BRAND.border};border-radius:14px;text-align:center;">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;color:${BRAND.primary};text-transform:uppercase;margin-bottom:10px;">${c.codeLabel}</div>
      <div style="font-family:'Courier New',Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:${isAr ? "0.15em" : "0.28em"};color:${BRAND.ink};direction:ltr;">${code}</div>
    </div>
  `
  const bodyHtml = `
    <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:${BRAND.ink};">${c.greeting}</h1>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.8;color:${BRAND.muted};">${c.intro}</p>
    ${codeBlock}
    <p style="margin:0 0 18px;font-size:13px;color:${BRAND.muted};text-align:center;">${c.expiry(expiresInMinutes)}</p>
    <p style="margin:0;padding:14px 16px;background-color:#FFF8ED;border:1px solid #F1E3C6;border-radius:12px;font-size:12.5px;line-height:1.8;color:#8A6D2F;">${c.warning}</p>
  `
  return {
    subject: c.subject,
    html: emailShell({ locale, previewText: c.preview(code), bodyHtml }),
  }
}

function actionButton(label: string, url: string): string {
  return `
    <div style="margin:22px 0;text-align:center;">
      <a href="${url}" style="display:inline-block;padding:13px 32px;background-color:${BRAND.primary};color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">${label}</a>
    </div>
    <p style="margin:0 0 4px;font-size:11.5px;line-height:1.7;color:#9C97A8;word-break:break-all;">${url}</p>
  `
}

const VERIFY_COPY = {
  ar: {
    subject: "تأكيد بريدك الإلكتروني — Med Aura",
    preview: "أكملي تفعيل حسابك في Med Aura",
    greeting: "مرحباً بك في Med Aura،",
    intro: "بقي خطوة واحدة فقط — اضغطي على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.",
    cta: "تأكيد البريد الإلكتروني",
    ignore: "إذا لم تُنشئي هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.",
  },
  en: {
    subject: "Confirm your email — Med Aura",
    preview: "Finish setting up your Med Aura account",
    greeting: "Welcome to Med Aura,",
    intro: "One last step — click the button below to confirm your email and activate your account.",
    cta: "Confirm email",
    ignore: "If you didn't create this account, you can safely ignore this email.",
  },
} as const

export function verifyEmailTemplate({
  locale,
  url,
}: {
  locale: Locale
  url: string
}): { subject: string; html: string } {
  const c = VERIFY_COPY[locale]
  const bodyHtml = `
    <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:${BRAND.ink};">${c.greeting}</h1>
    <p style="margin:0;font-size:14px;line-height:1.8;color:${BRAND.muted};">${c.intro}</p>
    ${actionButton(c.cta, url)}
    <p style="margin:16px 0 0;font-size:12.5px;line-height:1.7;color:${BRAND.muted};">${c.ignore}</p>
  `
  return { subject: c.subject, html: emailShell({ locale, previewText: c.preview, bodyHtml }) }
}

const RESET_COPY = {
  ar: {
    subject: "إعادة تعيين كلمة المرور — Med Aura",
    preview: "طلب إعادة تعيين كلمة المرور",
    greeting: "مرحباً،",
    intro: "تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك. اضغطي على الزر أدناه لاختيار كلمة مرور جديدة.",
    cta: "إعادة تعيين كلمة المرور",
    ignore: "إذا لم تطلبي ذلك، يمكنك تجاهل هذه الرسالة — كلمة مرورك لن تتغيّر.",
  },
  en: {
    subject: "Reset your password — Med Aura",
    preview: "Password reset requested",
    greeting: "Hi,",
    intro: "We received a request to reset your account's password. Click the button below to choose a new one.",
    cta: "Reset password",
    ignore: "If you didn't request this, you can safely ignore this email — your password won't change.",
  },
} as const

export function resetPasswordEmailTemplate({
  locale,
  url,
}: {
  locale: Locale
  url: string
}): { subject: string; html: string } {
  const c = RESET_COPY[locale]
  const bodyHtml = `
    <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:${BRAND.ink};">${c.greeting}</h1>
    <p style="margin:0;font-size:14px;line-height:1.8;color:${BRAND.muted};">${c.intro}</p>
    ${actionButton(c.cta, url)}
    <p style="margin:16px 0 0;font-size:12.5px;line-height:1.7;color:${BRAND.muted};">${c.ignore}</p>
  `
  return { subject: c.subject, html: emailShell({ locale, previewText: c.preview, bodyHtml }) }
}
