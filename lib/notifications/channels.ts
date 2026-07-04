import { isEmailConfigured } from "@/lib/env"

/**
 * Adapter-availability flags surfaced to the UI. Read-only booleans — never
 * expose the underlying credentials or their values. The UI uses these to
 * disable channel toggles the platform can't actually deliver on, so users
 * don't save preferences that are silently no-ops.
 */
export function isSmsAdapterConfigured(): boolean {
  return Boolean(
    process.env.SMS_PROVIDER_API_KEY && process.env.SMS_PROVIDER_FROM,
  )
}
export function isWhatsappAdapterConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_PROVIDER_ACCESS_TOKEN &&
      process.env.WHATSAPP_PROVIDER_PHONE_NUMBER_ID,
  )
}

export type ChannelAvailability = {
  inApp: boolean
  email: boolean
  sms: boolean
  whatsapp: boolean
}

export function channelAvailability(): ChannelAvailability {
  return {
    inApp: true, // always available (rendered from DB)
    email: isEmailConfigured(),
    sms: isSmsAdapterConfigured(),
    whatsapp: isWhatsappAdapterConfigured(),
  }
}
