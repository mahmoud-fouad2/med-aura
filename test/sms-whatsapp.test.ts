import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  sendSms,
  sendWhatsApp,
  WhatsAppTemplates,
  isMessagingConfigured,
} from "@/lib/sms-whatsapp"

describe("lib/sms-whatsapp", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.UNIFONIC_APP_SID
  })

  it("identifies unconfigured messaging state properly", () => {
    expect(isMessagingConfigured()).toBe(false)
  })

  it("handles mock SMS dispatch gracefully without error", async () => {
    const res = await sendSms({
      to: "+966500000000",
      message: "تأكيد موعد استشارتك التجميلية",
    })
    expect(res.success).toBe(true)
    expect(res.provider).toBe("mock")
  })

  it("handles mock WhatsApp dispatch gracefully without error", async () => {
    const res = await sendWhatsApp({
      to: "+966500000000",
      fallbackText: "رابط استشارتك المرئية",
    })
    expect(res.success).toBe(true)
    expect(res.provider).toBe("mock")
  })

  it("formats WhatsApp templates correctly", () => {
    const msg = WhatsAppTemplates.consultationReminder15Min(
      "نورة",
      "د. خالد",
      "https://medauraworld.com/video/room-123"
    )
    expect(msg).toContain("نورة")
    expect(msg).toContain("د. خالد")
    expect(msg).toContain("https://medauraworld.com/video/room-123")
  })
})
