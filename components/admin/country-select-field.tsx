"use client"

import { CountryCombobox } from "@/components/admin/country-combobox"
import { CountryFlag } from "@/components/ui/country-flag"
import { countryNameAr } from "@/lib/status-labels"

/**
 * Country picker for a form that stores a raw ISO alpha-2 code (center/doctor
 * location) rather than a row from the platform's own `country` table — shows
 * the current selection as a flag+name chip, with a search-to-change combobox
 * below it. Replaces a plain "type the ISO code from memory" text input.
 */
export function CountrySelectField({
  country,
  onChange,
}: {
  country: string
  onChange: (code: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
        <CountryFlag code={country} className="h-4 w-6" />
        <span className="flex-1 truncate text-foreground">
          {country ? countryNameAr(country) : "لم تُحدد بعد"}
        </span>
      </div>
      <CountryCombobox onSelect={(preset) => onChange(preset.code)} placeholder="ابحث لتغيير الدولة…" />
    </div>
  )
}
