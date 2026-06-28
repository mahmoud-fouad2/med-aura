"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setLocale } from "@/lib/i18n/actions"
import type { Locale } from "@/lib/i18n/config"

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const next: Locale = locale === "ar" ? "en" : "ar"

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocale(next)
          router.refresh()
        })
      }
      aria-label={next === "en" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="size-4" />
      {next === "en" ? "EN" : "ع"}
    </Button>
  )
}
