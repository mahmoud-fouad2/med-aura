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
import { CountryFlag } from "@/components/ui/country-flag"

export type CountrySelectOption = { id: string; nameAr: string; nameEn: string; code: string }

/**
 * Searchable picker over the platform's OWN configured countries (not the
 * world preset list — see CountryCombobox for that, used only while
 * creating/editing a country row). Matches Arabic name, English name, or
 * ISO code; submits the country id via `name` like any other form field.
 * Replaces a plain <Select> that only supported scrolling/typing the first
 * letter — unusable once there are more than a handful of countries.
 */
export function CountrySelectCombobox({
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "ابحث عن دولة بالاسم أو الكود…",
}: {
  name?: string
  options: CountrySelectOption[]
  defaultValue?: string
  value?: string
  onValueChange?: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.map((o) => o.id)
    return options
      .filter(
        (o) =>
          o.nameAr.includes(query.trim()) ||
          o.nameEn.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q),
      )
      .map((o) => o.id)
  }, [query, options])

  return (
    <Combobox<string>
      name={name}
      items={filtered}
      value={value}
      defaultValue={defaultValue}
      onInputValueChange={setQuery}
      itemToStringLabel={(id) => byId.get(id)?.nameAr ?? ""}
      onValueChange={(v) => {
        if (v && onValueChange) onValueChange(v)
      }}
    >
      <ComboboxInputGroup>
        <ComboboxInput placeholder={placeholder} />
      </ComboboxInputGroup>
      <ComboboxContent>
        <ComboboxEmpty>
          <div className="flex flex-col items-center gap-2 py-2">
            <Globe2 className="size-5 text-muted-foreground/60" />
            <p>لا توجد دولة مطابقة.</p>
          </div>
        </ComboboxEmpty>
        {filtered.map((id) => {
          const o = byId.get(id)
          if (!o) return null
          return (
            <ComboboxItem key={id} value={id}>
              <CountryFlag code={o.code} className="h-4 w-6" />
              <span className="min-w-0 flex-1 truncate">{o.nameAr}</span>
              <span dir="ltr" className="shrink-0 text-xs text-muted-foreground">
                {o.code}
              </span>
            </ComboboxItem>
          )
        })}
      </ComboboxContent>
    </Combobox>
  )
}
