"use client"

import { SegmentError } from "@/components/layout/segment-error"

export default function AdminError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <SegmentError
      {...props}
      scope="admin"
      title="تعذر تحميل مساحة الإدارة"
    />
  )
}
