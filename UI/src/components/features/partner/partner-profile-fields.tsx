import type { ReactNode } from "react"

const missing = "Chưa có thông tin"

export function PartnerProfileSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function PartnerProfileFields({
  fields,
}: {
  fields: ReadonlyArray<readonly [label: string, value: string | null]>
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0 space-y-1">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium break-words">
            {value?.trim() || missing}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
})

export function formatPartnerProfileDate(value: string | null) {
  if (!value) return null

  // The backend stores LocalDateTime in the application's Vietnam time zone.
  const date = new Date(value + "+07:00")
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}
