"use client"

import { SegmentError } from "@/components/layout/segment-error"

export default function DashboardError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <SegmentError
      {...props}
      scope="dashboard"
      title="تعذر تحميل لوحة التحكم"
    />
  )
}
