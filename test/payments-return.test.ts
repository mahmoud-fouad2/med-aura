import { describe, it, expect } from "vitest"
import { GET } from "@/app/api/payments/return/route"

describe("GET /api/payments/return", () => {
  it("returns mobile custom-scheme redirect and HTML bridge for mobile success checkout", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?platform=mobile&status=success&appointmentId=apt_abc123",
    )
    const res = await GET(req)

    expect(res.headers.get("Location")).toBe(
      "medaura://booking-payment?status=success&appointmentId=apt_abc123",
    )
    const text = await res.text()
    expect(text).toContain("medaura://booking-payment?status=success&appointmentId=apt_abc123")
    expect(text).toContain("تم تأكيد الدفع")
  })

  it("returns mobile custom-scheme redirect for canceled checkout", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?platform=mobile&status=canceled&appointmentId=apt_abc123",
    )
    const res = await GET(req)

    expect(res.headers.get("Location")).toBe(
      "medaura://booking-payment?status=canceled&appointmentId=apt_abc123",
    )
    const text = await res.text()
    expect(text).toContain("إلغاء عملية الدفع")
  })

  it("redirects web platform to web appointments dashboard on success", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?platform=web&status=success&appointmentId=apt_abc123",
    )
    const res = await GET(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get("location")
    expect(location).toContain("/dashboard/appointments?booked=apt_abc123")
  })

  it("redirects web platform to web appointments dashboard on canceled", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?status=canceled",
    )
    const res = await GET(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get("location")
    expect(location).toContain("/dashboard/appointments?canceled=1")
  })

  it("redirects web platform to case dashboard for quote deposit payment", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?platform=web&status=success&caseId=case_999&quoteId=q_111",
    )
    const res = await GET(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get("location")
    expect(location).toContain("/dashboard/cases/case_999?deposit=1")
  })

  it("returns mobile custom scheme with caseId and quoteId for quote deposit", async () => {
    const req = new Request(
      "http://localhost:3000/api/payments/return?platform=mobile&status=success&caseId=case_999&quoteId=q_111",
    )
    const res = await GET(req)

    expect(res.headers.get("Location")).toContain(
      "medaura://booking-payment?status=success&caseId=case_999&quoteId=q_111",
    )
  })
})
