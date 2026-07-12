/*
 * Med Aura service worker.
 *
 * Deliberately conservative for a dynamic, authenticated medical platform:
 * - HTML navigations are NEVER cached (no stale or private pages) — the only
 *   offline behavior for pages is the branded /offline fallback.
 * - Only same-origin GET requests for immutable/static assets are cached.
 * - /api/* is never touched.
 */
const CACHE = "medaura-v1"
const OFFLINE_URL = "/offline"
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.json",
  "/brand/med-aura-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

const STATIC_PATHS = [/^\/_next\/static\//, /^\/fonts\//, /^\/icons\//, /^\/brand\//]
const STATIC_EXT = /\.(png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?)$/

function isCacheableStatic(url) {
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith("/api/")) return false
  return (
    STATIC_PATHS.some((re) => re.test(url.pathname)) || STATIC_EXT.test(url.pathname)
  )
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  // Page navigations: network only, branded fallback when truly offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ??
            new Response("offline", { status: 503, statusText: "Offline" }),
        ),
      ),
    )
    return
  }

  const url = new URL(request.url)
  if (!isCacheableStatic(url)) return

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached ?? refresh
    }),
  )
})
