"use client"

import { MagnifyingGlass, X, Trash, CaretDown, CircleNotch } from "@phosphor-icons/react"

interface HistoryFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  timeRange: string
  onTimeRangeChange: (value: string) => void
  scamType: string
  onScamTypeChange: (value: string) => void
  selectedCount: number
  onDeleteSelected: () => void
  isDeleting?: boolean
}

export function HistoryFilterBar({
  searchQuery,
  onSearchChange,
  timeRange,
  onTimeRangeChange,
  scamType,
  onScamTypeChange,
  selectedCount,
  onDeleteSelected,
  isDeleting = false,
}: HistoryFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Row with Title Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
          Lịch Sử Kiểm Tra & Nhật Ký Truy Vấn
        </h1>

        <button
          type="button"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0 || isDeleting}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FFDAD6]/70 px-4 py-2 text-xs font-bold text-[#93000A] shadow-2xs transition-all hover:bg-[#FFDAD6] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950/80"
        >
          {isDeleting ? (
            <CircleNotch size={15} className="animate-spin" />
          ) : (
            <Trash size={15} weight="bold" />
          )}
          <span>
            {isDeleting
              ? "Đang xóa..."
              : `Xóa lịch sử đã chọn ${selectedCount > 0 ? `(${selectedCount})` : ""}`}
          </span>
        </button>
      </div>

      {/* Filter Row: Search Input & 2 Dropdowns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Search Input */}
        <div className="relative sm:col-span-6 lg:col-span-7">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo từ khóa tin nhắn, số điện thoại, URL..."
            className="w-full rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-9 pl-9 text-xs text-[#131B2E] placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#45464D] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground cursor-pointer"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        {/* Time Range Dropdown */}
        <div className="lg:col-span-2.5 relative sm:col-span-3">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-8 pl-3.5 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground cursor-pointer"
          >
            <option value="30_days">Khoảng thời gian: 30 ngày qua</option>
            <option value="7_days">Khoảng thời gian: 7 ngày qua</option>
            <option value="90_days">Khoảng thời gian: 90 ngày qua</option>
            <option value="all">Khoảng thời gian: Toàn bộ</option>
          </select>
          <CaretDown
            size={13}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
        </div>

        {/* Scam Type Dropdown */}
        <div className="lg:col-span-2.5 relative sm:col-span-3">
          <select
            value={scamType}
            onChange={(e) => onScamTypeChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-8 pl-3.5 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground cursor-pointer"
          >
            <option value="all">Hình thức: Toàn bộ thủ đoạn</option>
            <option value="telecom">Giả mạo viễn thông</option>
            <option value="malware">Mã độc & Dịch vụ công</option>
            <option value="banking">Tài chính & Ngân hàng</option>
            <option value="forex">Sàn tiền ảo & Đa cấp</option>
          </select>
          <CaretDown
            size={13}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  )
}
