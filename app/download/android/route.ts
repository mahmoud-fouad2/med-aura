import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * First-party APK download endpoint: redirects to the latest production Android APK release.
 * Using direct 302 redirect ensures maximum download speeds, resume support,
 * and eliminates memory/timeout limits on serverless runtimes.
 */
const UPSTREAM_APK_URL =
  "https://github.com/mahmoud-fouad2/med-aura/releases/download/apk-latest/med-aura.apk"

export async function GET() {
  return NextResponse.redirect(UPSTREAM_APK_URL, { status: 302 })
}
