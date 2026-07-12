import { FadeIn } from "@/components/motion"

/**
 * Re-mounts on every admin route change (unlike layout), giving each page a
 * consistent entrance without per-page motion wiring.
 */
export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <FadeIn y={10}>{children}</FadeIn>
}
