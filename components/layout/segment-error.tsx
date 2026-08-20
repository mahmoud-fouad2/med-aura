"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SegmentError({
  error,
  reset,
  scope,
  title,
}: {
  error: Error & { digest?: string }
  reset: () => void
  scope: string
  title: string
}) {
  useEffect(() => {
    console.error(`[${scope}] segment failed`, {
      name: error.name,
      digest: error.digest,
    })
  }, [error, scope])

  return (
    <section className="mx-auto flex min-h-[22rem] max-w-xl flex-col items-center justify-center px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        لم نتمكن من تحميل هذه الصفحة الآن. بياناتك محفوظة ويمكنك إعادة المحاولة.
      </p>
      <Button onClick={reset} className="mt-5 rounded-lg">
        <RotateCcw className="size-4" />
        إعادة المحاولة
      </Button>
    </section>
  )
}
