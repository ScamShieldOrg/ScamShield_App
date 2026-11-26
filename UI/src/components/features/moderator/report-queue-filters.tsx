"use client"

import { useRef } from "react"
import { motion } from "motion/react"
import { MagnifyingGlass, X } from "@phosphor-icons/react"
import { getNextTabIndex } from "@/components/features/report/report-helpers"
import { cn } from "@/lib/utils"
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  return (
    <div className="shrink-0 space-y-3 border-b border-border/70 bg-card p-4">
      <h2 className="font-heading text-base font-bold tracking-[-0.02em] text-foreground">
        Danh sách báo cáo
      </h2>
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          aria-label="Tìm báo cáo"
          className="min-h-10 w-full rounded-lg border border-black/10 bg-background py-2 pr-9 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && searchQuery) {
              onSearchChange("")
            }
          }}
          placeholder="Tìm mã báo cáo, đối tượng, người gửi..."
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" size={14} weight="bold" />
          </button>
        )}
      </div>

      <div
        className="flex flex-wrap gap-1 rounded-xl border border-black/10 bg-muted/40 p-1 dark:border-white/10"
        role="tablist"
        aria-label="Lọc theo trạng thái"
      >
        {tabs.map(([value, label], idx) => {
          const isActive = currentTab === value
          return (
            <button
              ref={(el) => {
                tabRefs.current[idx] = el
              }}
              type="button"
              role="tab"
              key={value}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(value)}
              onKeyDown={(e) => {
                const nextIdx = getNextTabIndex(idx, tabs.length, e.key)
                if (nextIdx !== null) {
                  e.preventDefault()
                  onTabChange(tabs[nextIdx][0])
                  tabRefs.current[nextIdx]?.focus()
                }
              }}
              className={cn(
                "relative inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="moderator-report-tab-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg border border-black/10 bg-card shadow-xs dark:border-white/12"
                />
              )}
              <span className="relative z-10">{label}</span>
              {(value === "PENDING" || value === "IN_REVIEW") && (
                <span className="relative z-10 inline-flex min-w-5 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {value === "PENDING" ? counts.pending : counts.inReview}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
