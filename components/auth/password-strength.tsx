"use client"

import zxcvbn from "zxcvbn"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

const COPY = {
  ar: {
    labels: ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "ممتازة"],
    empty: "اكتب كلمة مرور",
    // zxcvbn's own feedback strings are English-only (a fixed internal
    // dictionary, not localizable) — showing them to an Arabic user reads as
    // broken. These replace them, keyed by the same 0-4 score.
    hints: [
      "أضيفي كلمات أو رموزًا أكثر لتقويتها.",
      "جرّبي مزجًا من الحروف والأرقام والرموز.",
      "أضيفي رمزًا خاصًا لجعلها أقوى.",
      "",
      "",
    ],
  },
  en: {
    labels: ["Very weak", "Weak", "Fair", "Strong", "Excellent"],
    empty: "Type a password",
    hints: [
      "Add more words or characters.",
      "Try mixing letters, numbers, and symbols.",
      "Add a special character to make it stronger.",
      "",
      "",
    ],
  },
} as const

export function PasswordStrength({ password, locale }: { password: string; locale: Locale }) {
  const result = useMemo(() => zxcvbn(password), [password])
  const score = password ? result.score : 0 // 0 to 4
  const copy = COPY[locale]

  const currentLabel = password ? copy.labels[score] : copy.empty
  const hint = password ? copy.hints[score] : ""

  const getBarColor = (index: number) => {
    if (!password) return "bg-border"
    if (score === 0 || score === 1) return index === 0 ? "bg-destructive" : "bg-border"
    if (score === 2) return index <= 1 ? "bg-warning" : "bg-border"
    if (score === 3) return index <= 2 ? "bg-success" : "bg-border"
    if (score === 4) return index <= 3 ? "bg-primary" : "bg-border"
    return "bg-border"
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-colors duration-500",
              getBarColor(i)
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-[11px]">
        <span className={cn(
          "font-medium transition-colors duration-300",
          password && score <= 1 ? "text-destructive" : "",
          password && score === 2 ? "text-warning" : "",
          password && score >= 3 ? "text-success" : "",
          !password && "text-muted-foreground"
        )}>
          {currentLabel}
        </span>
        {hint && (
          <span className="text-muted-foreground truncate max-w-[200px]">{hint}</span>
        )}
      </div>
    </div>
  )
}
