"use client"

import { useRef, useState } from "react"
import { Camera, Loader2, Trash2, User } from "lucide-react"
import { getAvatarUploadUrlAction, finalizeAvatarAction, removeAvatarAction } from "@/lib/actions/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n"

const COPY = {
  ar: {
    change: "تغيير الصورة",
    remove: "إزالة",
    uploading: "جارٍ الرفع…",
    tooLarge: "حجم الصورة يتجاوز 8 ميجابايت.",
    invalidType: "استخدم صورة JPG أو PNG أو WebP.",
  },
  en: {
    change: "Change photo",
    remove: "Remove",
    uploading: "Uploading…",
    tooLarge: "Image is larger than 8MB.",
    invalidType: "Use a JPG, PNG, or WebP image.",
  },
} as const

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024

/** Self-service profile-photo upload — same presign/PUT-to-R2/finalize flow
 *  as the mobile app's avatar screen, shared between the patient settings
 *  page and the doctor practice-settings page. */
export function AvatarUploader({
  photoUrl,
  onChange,
  locale,
}: {
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
      const presign = await getAvatarUploadUrlAction({
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
      const finalized = await finalizeAvatarAction(presign.objectKey)
      if (!finalized.ok) {
        setError(finalized.error)
        return
      }
      setPreview(finalized.photoUrl)
      onChange(finalized.photoUrl)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    const result = await removeAvatarAction()
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPreview(null)
    onChange(null)
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary-origin R2 asset; next/image would need a remotePatterns entry per account
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-8 text-muted-foreground" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" />
            {busy ? t.uploading : t.change}
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleRemove()}>
              <Trash2 className="size-4" />
              {t.remove}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
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
