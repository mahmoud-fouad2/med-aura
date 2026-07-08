"use client"

import { useMemo, useState } from "react"
import { Clock } from "lucide-react"
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { listIanaTimezones } from "@/lib/geo"

const ALL_TIMEZONES = listIanaTimezones()

function humanLabel(tz: string): string {
  return tz.replace(/_/g, " ").replace("/", " — ")
}

/**
 * Searchable IANA timezone picker (418 zones — a plain <select> would be
 * unusable). `name` is applied to a hidden input via the Combobox root so it
 * participates in normal FormData submission like any other field.
 */
export function TimezoneCombobox({
  name,
  defaultValue,
  value,
  onValueChange,
}: {
  name?: string
  defaultValue?: string
  value?: string
  onValueChange?: (tz: string) => void
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_TIMEZONES.slice(0, 50)
    return ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 50)
  }, [query])

  return (
    <Combobox<string>
      name={name}
      items={filtered}
      value={value}
      defaultValue={defaultValue}
      onInputValueChange={setQuery}
      itemToStringLabel={(tz) => humanLabel(tz)}
      onValueChange={(v) => {
        if (v && onValueChange) onValueChange(v)
      }}
    >
      <ComboboxInputGroup>
        <ComboboxInput placeholder="ابحث عن مدينة أو منطقة زمنية…" />
      </ComboboxInputGroup>
      <ComboboxContent>
        <ComboboxEmpty>
          <div className="flex flex-col items-center gap-2 py-2">
            <Clock className="size-5 text-muted-foreground/60" />
            <p>لا توجد نتائج مطابقة.</p>
          </div>
        </ComboboxEmpty>
        {filtered.map((tz) => (
          <ComboboxItem key={tz} value={tz}>
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start">
              {humanLabel(tz)}
            </span>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  )
}
