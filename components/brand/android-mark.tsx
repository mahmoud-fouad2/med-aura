/**
 * The Android robot head. lucide-react ships no brand marks, and the generic
 * phone icon we used before didn't tell anyone *which* platform the download
 * targets — this does, at a glance.
 *
 * Drawn to Google's proportions (head, two antennae, two eyes) and inherits
 * `currentColor` so it can sit on any surface. Kept as a component rather
 * than a bundled asset so it stays crisp at every size and needs no request.
 */
export function AndroidMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {/* antennae */}
      <path
        d="M6.8 5.3 5.6 3.5a.4.4 0 0 1 .66-.44l1.23 1.84M17.2 5.3l1.2-1.8a.4.4 0 0 0-.66-.44l-1.23 1.84"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* head: flat-bottomed dome */}
      <path d="M4.2 11.2a7.8 7.8 0 0 1 15.6 0v.5H4.2v-.5Z" />
      {/* eyes knocked out of the dome */}
      <circle cx="8.8" cy="8.4" r="0.95" className="fill-white dark:fill-card" />
      <circle cx="15.2" cy="8.4" r="0.95" className="fill-white dark:fill-card" />
    </svg>
  )
}
