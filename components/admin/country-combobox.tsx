"use client"

import { useMemo, useState } from "react"
import { Globe2 } from "lucide-react"
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { COUNTRY_PRESETS, flagFromCountryCode, type CountryPreset } from "@/lib/geo"

/**
 * Searchable country picker — matches Arabic name, English name, ISO code,
 * or calling code, so "966", "SA", "سعود" and "saudi" all find the same
 * row. Selecting a country hands the full preset back to the caller, which
 * decides what to do with it (auto-fill, warn about unsaved edits, etc.) —
 * this component only picks, it never writes to the form itself.
 */
export function CountryCombobox({
  onSelect,
  placeholder = "ابحث بالاسم أو الكود أو رمز الاتصال…",
}: {
  onSelect: (preset: CountryPreset) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/[^\d]/g, "")
    if (!q) return COUNTRY_PRESETS
    return COUNTRY_PRESETS.filter((p) => {
      if (p.nameAr.includes(query.trim())) return true
      if (p.nameEn.toLowerCase().includes(q)) return true
      if (p.code.toLowerCase().includes(q)) return true
      if (qDigits && p.callingCode.replace("+", "").startsWith(qDigits)) return true
      return false
    })
  }, [query])

  return (
    <Combobox<CountryPreset>
      items={filtered}
      onInputValueChange={setQuery}
      itemToStringLabel={(p) => `${p.nameAr} — ${p.nameEn}`}
      onValueChange={(value) => {
        if (value) onSelect(value)
        setQuery("")
      }}
    >
      <ComboboxInputGroup>
        <ComboboxInput placeholder={placeholder} />
      </ComboboxInputGroup>
      <ComboboxContent>
        <ComboboxEmpty>
          <div className="flex flex-col items-center gap-2 py-2">
            <Globe2 className="size-5 text-muted-foreground/60" />
            <p>لا توجد دولة مطابقة — يمكنك إدخال البيانات يدويًا أدناه.</p>
          </div>
        </ComboboxEmpty>
        {filtered.map((p) => (
          <ComboboxItem key={p.code} value={p}>
            <span aria-hidden="true" className="text-base leading-none">
              {flagFromCountryCode(p.code)}
            </span>
            <span className="min-w-0 flex-1 truncate">{p.nameAr}</span>
            <span dir="ltr" className="shrink-0 text-xs text-muted-foreground">
              {p.nameEn} · {p.callingCode}
            </span>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  )
}
