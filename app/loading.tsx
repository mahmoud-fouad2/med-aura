import { LogoMark } from "@/components/brand/logo"

export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="animate-pulse text-primary">
        <LogoMark className="size-12" />
      </div>
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  )
}
