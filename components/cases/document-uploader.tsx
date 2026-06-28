"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_FILE_BYTES, isAllowedMime } from "@/lib/uploads"

type Doc = { id: string; fileName: string; contentType: string }

export function DocumentUploader({
  caseId,
  initialDocuments,
  canUpload,
}: {
  caseId: string
  initialDocuments: Doc[]
  canUpload: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<Doc[]>(initialDocuments)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        if (!isAllowedMime(file.type)) {
          setError("نوع الملف غير مسموح. ارفع صورة أو PDF.")
          continue
        }
        if (file.size > MAX_FILE_BYTES) {
          setError("حجم الملف يتجاوز 15 ميجابايت.")
          continue
        }

        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            kind: file.type === "application/pdf" ? "MEDICAL_REPORT" : "CASE_PHOTO",
          }),
        })
        if (!presignRes.ok) {
          const body = await presignRes.json().catch(() => ({}))
          setError(body.error ?? "تعذّر بدء الرفع.")
          continue
        }
        const { documentId, uploadUrl } = await presignRes.json()

        const put = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })
        if (!put.ok) {
          setError("فشل رفع الملف إلى التخزين.")
          continue
        }

        const fin = await fetch("/api/uploads/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        })
        if (!fin.ok) {
          const body = await fin.json().catch(() => ({}))
          setError(body.error ?? "تعذّر إنهاء الرفع.")
          continue
        }

        setDocs((d) => [
          { id: documentId, fileName: file.name, contentType: file.type },
          ...d,
        ])
      }
      router.refresh()
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {busy ? "جارٍ الرفع…" : "رفع صور أو تقارير"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            صور (JPG/PNG/WebP) أو PDF، حتى 15 ميجابايت. ملفاتك خاصة ولا يطّلع
            عليها أحد إلا بإذنك.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد ملفات بعد.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{d.fileName}</span>
              </span>
              <a
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Eye className="size-4" /> عرض
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
