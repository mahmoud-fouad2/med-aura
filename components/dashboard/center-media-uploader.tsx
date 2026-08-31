"use client"

import { useRef, useState } from "react"
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react"
import { getCenterMediaUploadUrlAction, finalizeCenterMediaAction } from "@/lib/actions/center"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

const COPY = {
  ar: {
    logoLabel: "الشعار",
    coverLabel: "صورة الغلاف",
    change: "تغيير",
    uploading: "جارٍ الرفع…",
    tooLarge: "حجم الصورة يتجاوز 8 ميجابايت.",
    invalidType: "استخدم صورة JPG أو PNG أو WebP.",
  },
  en: {
    logoLabel: "Logo",
    coverLabel: "Cover photo",
    change: "Change",
    uploading: "Uploading…",
    tooLarge: "Image is larger than 8MB.",
    invalidType: "Use a JPG, PNG, or WebP image.",
  },
} as const

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024

/** Logo (round) or cover (wide) upload for a center's own dashboard —
 *  same presign/PUT-to-R2/finalize shape as AvatarUploader, just pointed at
 *  center.logoKey/coverKey via lib/actions/center.ts's dedicated actions. */
export function CenterMediaUploader({
  field,
  photoUrl,
  onChange,
  locale,
}: {
  field: "logo" | "cover"
  photoUrl: string | null
  onChange: (url: string | null) => void
  locale: Locale
}) {
  const t = COPY[locale]
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl)

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED.has(file.type)) {
      setError(t.invalidType)
      return
    }
    if (file.size > MAX_BYTES) {
      setError(t.tooLarge)
      return
    }
    setBusy(true)
    try {
      const presign = await getCenterMediaUploadUrlAction({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      if (!presign.ok) {
        setError(presign.error)
        return
      }
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!put.ok) {
        setError(t.invalidType)
        return
      }
      const finalized = await finalizeCenterMediaAction({ field, objectKey: presign.objectKey })
      if (!finalized.ok) {
        setError(finalized.error)
        return
      }
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      onChange(objectUrl)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const label = field === "logo" ? t.logoLabel : t.coverLabel
  const isCover = field === "cover"

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted",
            isCover ? "h-20 w-36 rounded-lg" : "size-20 rounded-full",
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary-origin R2 asset
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" />
            {busy ? t.uploading : t.change}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
    </div>
  )
}
