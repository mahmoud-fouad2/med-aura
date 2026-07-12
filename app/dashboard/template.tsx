import { FadeIn } from "@/components/motion"

/**
 * Re-mounts on every dashboard route change (unlike layout), giving each page
 * a consistent entrance without per-page motion wiring.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <FadeIn y={10}>{children}</FadeIn>
}
