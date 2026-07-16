export const dynamic = "force-dynamic"

/**
 * First-party APK download: streams the latest build through our own domain
 * so the address the user sees (and shares) is med-aura's, not the storage
 * host's. The upstream release stays the single source of truth — this
 * route never caches a stale copy, and a download in progress streams
 * chunk-by-chunk (the file is never buffered in server memory).
 */
const UPSTREAM =
  "https://github.com/mahmoud-fouad2/med-aura/releases/download/apk-latest/med-aura.apk"

export async function GET() {
  let upstream: Response
  try {
    upstream = await fetch(UPSTREAM, { redirect: "follow", cache: "no-store" })
  } catch {
    return unavailable()
  }
  if (!upstream.ok || !upstream.body) return unavailable()

  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="med-aura.apk"',
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  })
  const length = upstream.headers.get("content-length")
  if (length) headers.set("Content-Length", length)

  return new Response(upstream.body, { headers })
}

function unavailable() {
  return new Response(
    JSON.stringify({ error: "التطبيق غير متاح مؤقتًا. حاول بعد قليل." }),
    {
      status: 503,
      headers: { "Content-Type": "application/json", "Retry-After": "120" },
    },
  )
}
