export type EditorialItem = {
  title: string
  body: string
}

export function SeoEditorialBand({
  eyebrow,
  title,
  intro,
  items,
}: {
  eyebrow: string
  title: string
  intro: string
  items: EditorialItem[]
}) {
  return (
    <section className="border-t border-border/70 bg-background py-14 sm:py-18" aria-labelledby="editorial-band-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-primary">{eyebrow}</p>
          <h2 id="editorial-band-title" className="font-heading mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{intro}</p>
        </div>
        <div className="mt-9 grid border-y border-border/70 md:grid-cols-3 md:divide-x md:divide-x-reverse md:divide-border/70 rtl:md:divide-x-reverse">
          {items.map((item) => (
            <article key={item.title} className="py-6 md:px-7 first:ps-0 last:pe-0">
              <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
