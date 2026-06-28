"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Technical detail stays in the console/logs, never shown to the user.
    console.error("Unhandled error", error)
  }, [error])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          حدث خطأ غير متوقع
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          نعتذر عن ذلك. يمكنك المحاولة مرة أخرى، وإذا استمرت المشكلة تواصل معنا.
        </p>
      </div>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </main>
  )
}
