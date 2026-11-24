"use client"

import { MagnifyingGlass } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { AUDIT_LOGS, actionLabel, entityLabel } from "./audit-log-data"

export interface AuditFilters {
  query: string
  entity: string
  action: string
  start: string
  end: string
}
export const EMPTY_FILTERS: AuditFilters = {
  query: "",
  entity: "",
  action: "",
  start: "",
  end: "",
}
const fieldClass =
  "mt-1.5 h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AuditLogFilters({
  filters,
  onChange,
}: {
  filters: AuditFilters
  onChange: (filters: AuditFilters) => void
}) {
  const invalid =
    !!filters.start && !!filters.end && filters.end < filters.start
  function update(key: keyof AuditFilters, value: string) {
    onChange({ ...filters, [key]: value })
  }
  return (
    <div className="border-b border-border p-4 sm:p-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="min-w-0 text-xs font-semibold sm:col-span-2 xl:col-span-1">
          Tìm nhật ký
          <div className="relative">
            <MagnifyingGlass
              aria-hidden="true"
              size={17}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
              placeholder="Người thực hiện, hành động, đối tượng…"
              className={`${fieldClass} pl-10`}
            />
          </div>
        </label>
        <label className="min-w-0 text-xs font-semibold">
          Loại đối tượng
          <select
            value={filters.entity}
            onChange={(event) => update("entity", event.target.value)}
            className={fieldClass}
          >
            <option value="">Tất cả đối tượng</option>
            {[...new Set(AUDIT_LOGS.map((entry) => entry.entityType))].map(
              (value) => (
                <option key={value} value={value}>
                  {entityLabel(value)}
                </option>
              )
            )}
          </select>
        </label>
        <label className="min-w-0 text-xs font-semibold">
          Hành động
          <select
            value={filters.action}
            onChange={(event) => update("action", event.target.value)}
            className={fieldClass}
          >
            <option value="">Tất cả hành động</option>
            {[...new Set(AUDIT_LOGS.map((entry) => entry.action))].map(
              (value) => (
                <option key={value} value={value}>
                  {actionLabel(value)}
                </option>
              )
            )}
          </select>
        </label>
        <label className="min-w-0 text-xs font-semibold">
          Từ ngày
          <input
            type="date"
            value={filters.start}
            onChange={(event) => update("start", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="min-w-0 text-xs font-semibold">
          Đến ngày
          <input
            type="date"
            value={filters.end}
            onChange={(event) => update("end", event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? "audit-date-error" : undefined}
            className={fieldClass}
          />
        </label>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Xóa bộ lọc
          </Button>
        </div>
      </div>
      {invalid ? (
        <p
          id="audit-date-error"
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Thời gian theo giờ Việt Nam (UTC+7). Bao gồm cả ngày bắt đầu và ngày
          kết thúc.
        </p>
      )}
    </div>
  )
}
