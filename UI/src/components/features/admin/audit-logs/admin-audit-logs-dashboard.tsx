"use client"

import { filterAuditLogs } from "./filter-audit-logs"

import { useState } from "react"
import { ClockCounterClockwise, Info } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { AUDIT_LOGS, type AuditLogEntry } from "./audit-log-data"
import {
  AuditLogFilters,
  EMPTY_FILTERS,
  type AuditFilters,
} from "./audit-log-filters"
import { AuditLogList } from "./audit-log-list"
import { AuditLogDetailDialog } from "./audit-log-detail-dialog"

const PAGE_SIZE = 10

export function AdminAuditLogsDashboard() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<{
    entry: AuditLogEntry
    trigger: HTMLElement
  } | null>(null)
  const invalidDates =
    !!filters.start && !!filters.end && filters.end < filters.start
  const filtered = filterAuditLogs(AUDIT_LOGS, filters)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const entries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function updateFilters(value: AuditFilters) {
    setFilters(value)
    setPage(1)
  }

  return (
    <section aria-labelledby="audit-heading" className="mx-auto max-w-[1800px]">
      <header className="mb-6">
        <h1
          id="audit-heading"
          className="font-heading text-xl font-bold tracking-tight sm:text-2xl"
        >
          Nhật ký hoạt động
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Tra cứu hoạt động quản trị, kiểm duyệt và các thay đổi đã ghi nhận.
        </p>
      </header>
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong className="text-foreground">Dữ liệu minh họa.</strong> Nhật ký
          mẫu dùng để xem giao diện, không phản ánh hoạt động thực tế của hệ
          thống.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-5 sm:px-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <ClockCounterClockwise size={19} aria-hidden="true" /> Lịch sử thay
            đổi
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Mới nhất trước · Chỉ xem
          </span>
        </div>
        <AuditLogFilters filters={filters} onChange={updateFilters} />
        <p
          role="status"
          className="border-b border-border px-4 py-3 text-xs text-muted-foreground sm:px-5"
        >
          {invalidDates
            ? "Vui lòng điều chỉnh khoảng ngày để xem kết quả."
            : `${filtered.length} bản ghi phù hợp · ${filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length}`}
        </p>
        {entries.length ? (
          <AuditLogList
            entries={entries}
            onSelect={(entry, trigger) => setSelected({ entry, trigger })}
          />
        ) : (
          <div className="px-4 py-14 text-center">
            <h3 className="font-heading text-sm font-semibold">
              {invalidDates
                ? "Khoảng ngày không hợp lệ"
                : "Không tìm thấy nhật ký phù hợp"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {invalidDates
                ? "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu."
                : "Thử thay đổi từ khóa, hành động hoặc khoảng ngày."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => updateFilters(EMPTY_FILTERS)}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
        <nav
          aria-label="Phân trang nhật ký"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4"
        >
          <span className="text-xs text-muted-foreground">
            Trang {page} / {pageCount} · 10 bản ghi / trang
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || invalidDates}
              onClick={() => setPage((current) => current - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount || invalidDates}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </Button>
          </div>
        </nav>
      </div>
      {selected && (
        <AuditLogDetailDialog
          entry={selected.entry}
          returnFocus={selected.trigger}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
