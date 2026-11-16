"use client"
import { MagnifyingGlass } from "@phosphor-icons/react"
import type {
  QueueFilterTab,
  ModeratorQueueCounts,
} from "@/features/moderator/types/moderator.types"
const tabs: [QueueFilterTab, string][] = [
  ["ALL", "Tất cả"],
  ["PENDING", "Chờ duyệt"],
  ["IN_REVIEW", "Đang duyệt"],
  ["APPROVED", "Đã phê duyệt"],
  ["REJECTED", "Đã từ chối"],
]
export function ReportQueueFilters({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  counts,
}: {
  currentTab: QueueFilterTab
  onTabChange: (tab: QueueFilterTab) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  counts: ModeratorQueueCounts
}) {
  return (
    <div className="shrink-0 space-y-3 border-b border-border bg-card p-4">
      <h2 className="text-base font-semibold">Danh sách báo cáo</h2>
      <div className="relative">
        <MagnifyingGlass size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          aria-label="Tìm báo cáo"
          className="h-10 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm mã báo cáo, đối tượng, người gửi..."
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo trạng thái">
        {tabs.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={currentTab === value}
            onClick={() => onTabChange(value)}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${currentTab === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground"}`}
          >
            {label}
            {(value === "PENDING" || value === "IN_REVIEW") && (
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${currentTab === value ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background text-foreground"}`}
              >
                {value === "PENDING" ? counts.pending : counts.inReview}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
