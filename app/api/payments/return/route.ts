import { NextResponse } from "next/server"
import { z } from "zod"
import { appUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

const QuerySchema = z.object({
  platform: z.enum(["web", "mobile"]).optional().default("web"),
  status: z.enum(["success", "canceled"]).optional().default("success"),
  appointmentId: z.string().optional(),
  caseId: z.string().optional(),
  quoteId: z.string().optional(),
  invoiceId: z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    platform: searchParams.get("platform") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    appointmentId: searchParams.get("appointmentId") ?? undefined,
    caseId: searchParams.get("caseId") ?? undefined,
    quoteId: searchParams.get("quoteId") ?? undefined,
    invoiceId: searchParams.get("invoiceId") ?? undefined,
  })

  const { platform, status, appointmentId, caseId, quoteId, invoiceId } = parsed.success
    ? parsed.data
    : {
        platform: "web" as const,
        status: "canceled" as const,
        appointmentId: undefined,
        caseId: undefined,
        quoteId: undefined,
        invoiceId: undefined,
      }

  if (platform === "mobile") {
    const deepLinkParams = new URLSearchParams({ status })
    if (appointmentId) {
      deepLinkParams.set("appointmentId", appointmentId)
    }
    if (caseId) {
      deepLinkParams.set("caseId", caseId)
    }
    if (quoteId) {
      deepLinkParams.set("quoteId", quoteId)
    }
    if (invoiceId) {
      deepLinkParams.set("invoiceId", invoiceId)
    }
    const deepLinkUrl = `medaura://booking-payment?${deepLinkParams.toString()}`

    // Render an HTML bridge page that immediately attempts custom-scheme navigation
    // while providing a fallback button if auto-redirection is constrained by the browser.
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>العودة إلى تطبيق ميد أورا</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0d1527;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
      line-height: 1;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: #f1f5f9;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 12px 24px;
      background-color: #0284c7;
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      box-sizing: border-box;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${status === "success" ? "✓" : "↺"}</div>
    <h1>${status === "success" ? "تم تأكيد الدفع" : "إلغاء عملية الدفع"}</h1>
    <p>جارٍ العودة إلى تطبيق ميد أورا تلقائيًا... إذا لم يتم نقلك اضغط على الزر أدناه.</p>
    <a href="${deepLinkUrl}" class="btn">العودة إلى التطبيق</a>
  </div>
  <script>
    window.location.replace("${deepLinkUrl}");
  </script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        Location: deepLinkUrl,
      },
    })
  }

  // Web redirect
  if (caseId) {
    const targetUrl = new URL(`/dashboard/cases/${caseId}`, appUrl())
    if (status === "success") {
      targetUrl.searchParams.set(quoteId ? "deposit" : "paid", "1")
    } else {
      targetUrl.searchParams.set(quoteId ? "deposit_canceled" : "canceled", "1")
    }
    return NextResponse.redirect(targetUrl)
  }

  const targetUrl = new URL("/dashboard/appointments", appUrl())
  if (status === "success") {
    targetUrl.searchParams.set("booked", appointmentId ?? "1")
  } else {
    targetUrl.searchParams.set("canceled", "1")
  }

  return NextResponse.redirect(targetUrl)
}
