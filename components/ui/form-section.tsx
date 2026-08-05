/**
 * Groups related Fields under a small heading inside a bordered card —
 * used to break a long admin edit form into logical sections (identity,
 * location, contact, …) instead of one flat list of inputs.
 */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3.5">
      <h3 className="text-xs font-bold text-foreground">{title}</h3>
      {children}
    </div>
  )
}
