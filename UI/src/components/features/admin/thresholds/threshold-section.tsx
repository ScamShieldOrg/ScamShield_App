import type { ReactNode } from "react"

export function ThresholdSection({
  id,
  title,
  description,
  source,
  children,
}: {
  id: string
  title: string
  description: string
  source: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="min-w-0 scroll-mt-6 rounded-xl border border-border bg-card"
    >
      <div className="border-b border-border p-4 sm:p-5">
        <h2 id={`${id}-title`} className="font-heading text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      <p className="border-t border-border bg-muted/20 px-4 py-3 text-[11px] leading-5 break-words text-muted-foreground sm:px-5">
        Nguồn trong kho mã: <code className="break-all">{source}</code>
      </p>
    </section>
  )
}

export function SettingValues({
  items,
}: {
  items: { label: string; value: string; hint: string }[]
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 font-heading text-xl font-semibold break-words tabular-nums">
            {item.value}
          </dd>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {item.hint}
          </p>
        </div>
      ))}
    </dl>
  )
}
