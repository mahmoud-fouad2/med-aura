"use client"

import zxcvbn from "zxcvbn"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export function PasswordStrength({ password }: { password: string }) {
  const result = useMemo(() => zxcvbn(password), [password])
  const score = password ? result.score : 0 // 0 to 4

  const strengthLabels = ["ضعيفة جداً", "ضعيفة", "متوسطة", "قوية", "ممتازة"]
  const currentLabel = password ? strengthLabels[score] : "اكتب كلمة مرور"
  
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
        {password && result.feedback.warning && (
          <span className="text-muted-foreground truncate max-w-[200px]">
            {result.feedback.warning}
          </span>
        )}
      </div>
    </div>
  )
}
