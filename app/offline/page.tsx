import Image from "next/image"
import { WifiOff } from "lucide-react"

export const metadata = { title: "لا يوجد اتصال" }

/**
 * Offline fallback served by the service worker when a navigation fails.
 * Kept dependency-light so the cached copy stays valid across deploys.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Image
        src="/brand/med-aura-logo.png"
        alt="Med Aura"
        width={72}
        height={72}
        className="h-18 w-auto"
        priority
      />
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-7" />
      </span>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          لا يوجد اتصال بالإنترنت
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          تعذّر الوصول إلى Med Aura الآن. تحقّق من اتصالك بالشبكة ثم أعد
          المحاولة — بياناتك ورحلتك محفوظة ولن تفقد شيئًا.
        </p>
      </div>
      {/* Deliberately a plain <a>: this page is served from the service-worker
          cache while offline, where client-side <Link> navigation can't be
          trusted — retrying must be a full document load. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        إعادة المحاولة
      </a>
    </main>
  )
}
