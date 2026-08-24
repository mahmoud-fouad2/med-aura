/**
 * SMS and WhatsApp Notification Dispatcher for Med Aura.
 *
 * Supports Twilio, Unifonic, and WhatsApp Business API.
 * In development or when API keys are omitted, safely logs to logger
 * without breaking user journeys.
 */

import { logger } from "./logger"

export type SmsMessageInput = {
  to: string // E.164 phone number, e.g. +966501234567
  message: string
}

export type WhatsAppMessageInput = {
  to: string // E.164 phone number, e.g. +966501234567
  templateName?: string
  parameters?: Record<string, string>
  fallbackText?: string
}

export type MessageDispatchResult = {
  success: boolean
  provider: "twilio" | "unifonic" | "mock"
  messageId?: string
  error?: string
}

/**
 * Checks if SMS/WhatsApp providers are configured in environment variables.
 */
export function isMessagingConfigured(): boolean {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
    process.env.UNIFONIC_APP_SID
  )
}

/**
 * Dispatches an SMS message.
 */
export async function sendSms(input: SmsMessageInput): Promise<MessageDispatchResult> {
  const { to, message } = input

  // Twilio integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")

      const form = new URLSearchParams({
        To: to,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: message,
      })

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      })

      if (!res.ok) {
        const errorText = await res.text()
        logger.error("Twilio SMS failed", { status: res.status, error: errorText })
        return { success: false, provider: "twilio", error: errorText }
      }

      const data = (await res.json()) as { sid: string }
      return { success: true, provider: "twilio", messageId: data.sid }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("Twilio SMS exception", { error: msg })
      return { success: false, provider: "twilio", error: msg }
    }
  }

  // Unifonic (popular in GCC/Saudi Arabia) integration
  if (process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_SENDER_ID) {
    try {
      const endpoint = "https://el.cloud.unifonic.com/rest/SMS/messages"
      const params = new URLSearchParams({
        AppSid: process.env.UNIFONIC_APP_SID,
        SenderID: process.env.UNIFONIC_SENDER_ID,
        Recipient: to.replace("+", ""),
        Body: message,
      })

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })

      const data = (await res.json()) as { success: boolean; data?: { MessageID: string }; message?: string }
      if (data.success) {
        return { success: true, provider: "unifonic", messageId: data.data?.MessageID }
      }
      return { success: false, provider: "unifonic", error: data.message }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("Unifonic SMS exception", { error: msg })
      return { success: false, provider: "unifonic", error: msg }
    }
  }

  // Mock / Log mode
  logger.info("[SMS Mock] Message sent", { to, message: message.slice(0, 80) })
  return { success: true, provider: "mock", messageId: `mock-sms-${Date.now()}` }
}

/**
 * Dispatches a WhatsApp notification.
 */
export async function sendWhatsApp(input: WhatsAppMessageInput): Promise<MessageDispatchResult> {
  const { to, fallbackText = "" } = input

  // Twilio WhatsApp
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  ) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")

      const form = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        Body: fallbackText,
      })

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      })

      if (!res.ok) {
        const errorText = await res.text()
        logger.error("Twilio WhatsApp failed", { status: res.status, error: errorText })
        return { success: false, provider: "twilio", error: errorText }
      }

      const data = (await res.json()) as { sid: string }
      return { success: true, provider: "twilio", messageId: data.sid }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("Twilio WhatsApp exception", { error: msg })
      return { success: false, provider: "twilio", error: msg }
    }
  }

  // Mock / Log mode
  logger.info("[WhatsApp Mock] Notification sent", { to, text: fallbackText.slice(0, 80) })
  return { success: true, provider: "mock", messageId: `mock-wa-${Date.now()}` }
}

/**
 * Standard WhatsApp & SMS Arabic templates for the Med Aura patient journey.
 */
export const WhatsAppTemplates = {
  consultationConfirmed: (patientName: string, doctorName: string, dateTime: string, roomUrl: string) =>
    `مرحباً ${patientName}،\nتم تأكيد موعد استشارتكِ التجميلية مع ${doctorName} في ${dateTime}.\nرابط غرفة الاستشارة المرئية:\n${roomUrl}\n\nنتمنى لكِ تجربة مميزة مع Med Aura ✨`,

  consultationReminder15Min: (patientName: string, doctorName: string, roomUrl: string) =>
    `مرحباً ${patientName}،\nتذكير: تبدأ استشارتكِ المرئية مع ${doctorName} خلال 15 دقيقة.\nيرجى الانضمام عبر الرابط التالي:\n${roomUrl}\n\nMed Aura 🌸`,

  casePlanReady: (patientName: string, doctorName: string, caseUrl: string) =>
    `مرحباً ${patientName}،\nأعدّ ${doctorName} خطتكِ العلاجية وتقدير التكلفة لحالتكِ.\nيمكنكِ مراجعتها الآن عبر:\n${caseUrl}\n\nفريق Med Aura`,

  followUpReminder: (patientName: string, followUpUrl: string) =>
    `مرحباً ${patientName}،\nنود الاطمئنان على تعافيكِ وراحتكِ بعد الإجراء.\nيرجى تحديث حالتكِ أو مشاركة ملاحظاتكِ لطبيبكِ عبر الرابط:\n${followUpUrl}\n\nدمتِ بصحة وجمال 💖`,
}
