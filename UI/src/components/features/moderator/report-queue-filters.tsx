"use client"
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
  ["WITHDRAWN", "Đã thu hồi"],
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
    <div className="space-y-3 border-b border-border p-4">
      <h2 className="font-semibold">Hàng đợi xét duyệt</h2>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-foreground">
          <strong className="mr-1 tabular-nums">{counts.pending}</strong> chờ
          duyệt
        </span>
        <span className="rounded-lg border border-border px-2.5 py-1.5 text-foreground">
          <strong className="mr-1 tabular-nums">{counts.all}</strong> tổng số
        </span>
      </div>
      <input
        aria-label="Tìm báo cáo"
        className="w-full rounded-lg border border-border bg-background p-2 text-sm"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tìm mã báo cáo, đối tượng, người gửi..."
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={currentTab === value}
            onClick={() => onTabChange(value)}
            className={`rounded-lg px-2 py-1 text-xs ${currentTab === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
