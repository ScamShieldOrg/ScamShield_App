"use client"

import Link from "next/link"
import {
  ArrowCounterClockwise,
  CaretDown,
  MagnifyingGlass,
  ShieldPlus,
  X,
} from "@phosphor-icons/react"

interface HistoryFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  timeRange: string
  onTimeRangeChange: (value: string) => void
  scamType: string
  onScamTypeChange: (value: string) => void
  hasActiveFilters?: boolean
  onResetFilters?: () => void
  totalItems?: number
}

export function HistoryFilterBar({
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  scamType,
  onScamTypeChange,
  hasActiveFilters = false,
  onResetFilters,
  totalItems,
}: HistoryFilterBarProps) {
  return (
    <div className="space-y-5">
      {/* Header Row: Title + Single Primary CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground">
            Lịch sử kiểm tra
          </h1>
          <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            Tra cứu lại kết quả phân tích trước đây, đối chiếu cập nhật hồi tố
            và quản lý nhật ký cá nhân.
            {typeof totalItems === "number" && (
              <span className="ml-1.5 font-medium text-foreground tabular-nums">
                ({totalItems} bản ghi)
              </span>
            )}
          </p>
        </div>

        <Link
          href="/user/check"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ShieldPlus aria-hidden="true" size={18} weight="bold" />
          <span>Kiểm tra mới</span>
        </Link>
      </div>

      {/* Filter Surface */}
      <div className="rounded-xl border border-black/10 bg-card p-3 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-4 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search Input */}
          <div className="relative md:col-span-6">
            <label htmlFor="history-search-input" className="sr-only">
              Tìm kiếm trong lịch sử kiểm tra
            </label>
            <MagnifyingGlass
              aria-hidden="true"
              size={18}
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && searchQuery) {
                  e.preventDefault()
                  onSearchChange("")
                }
              }}
              placeholder="Tìm theo nội dung, số điện thoại, đường dẫn..."
              className="min-h-10 w-full rounded-lg border border-black/10 bg-background py-2 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-background/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" size={15} weight="bold" />
              </button>
            )}
          </div>

          {/* Time Range Select */}
          <div className="relative md:col-span-3">
            <label htmlFor="history-time-range" className="sr-only">
              Lọc theo khoảng thời gian
            </label>
            <select
              id="history-time-range"
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="min-h-10 w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-background py-2 pr-9 pl-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-background/60"
            >
              <option value="30_days">30 ngày qua</option>
              <option value="7_days">7 ngày qua</option>
              <option value="90_days">90 ngày qua</option>
              <option value="all">Toàn bộ thời gian</option>
            </select>
            <CaretDown
              aria-hidden="true"
              size={14}
              weight="bold"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          {/* Scam Type Select */}
          <div className="relative md:col-span-3">
            <label htmlFor="history-scam-type" className="sr-only">
              Lọc theo phân loại thủ đoạn
            </label>
            <select
              id="history-scam-type"
              value={scamType}
              onChange={(e) => onScamTypeChange(e.target.value)}
              className="min-h-10 w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-background py-2 pr-9 pl-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12 dark:bg-background/60"
            >
              <option value="all">Mọi phân loại</option>
              <option value="telecom">Giả mạo viễn thông</option>
              <option value="malware">Mã độc & Dịch vụ công</option>
              <option value="banking">Tài chính & Ngân hàng</option>
              <option value="forex">Sàn tiền ảo & Đa cấp</option>
            </select>
            <CaretDown
              aria-hidden="true"
              size={14}
              weight="bold"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        {hasActiveFilters && onResetFilters && (
          <div className="mt-3 flex items-center justify-end border-t border-border/70 pt-2.5">
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowCounterClockwise aria-hidden="true" size={14} weight="bold" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
