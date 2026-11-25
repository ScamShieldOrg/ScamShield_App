"use client"

import { RecentReportsTable } from "./recent-reports-table"
import { buildReportPageRange, getNextTabIndex } from "./report-helpers"
import { useRef, useState } from "react"
import { motion } from "motion/react"
import {
  MagnifyingGlass,
  CaretDown,
  CalendarBlank,
  ArrowsClockwise,
  X,
} from "@phosphor-icons/react"
import {
  TrackingReportItem,
  ReportStatus,
  ReportStatusCounts,
  ScamCategoryItem,
} from "@/features/report/types/report.types"
import { cn } from "@/lib/utils"

interface ReportTrackingTableProps {
  items: TrackingReportItem[]
  statusCounts?: ReportStatusCounts
  categories?: ScamCategoryItem[]
  isLoading?: boolean
  search?: string
  onSearchChange?: (val: string) => void
  selectedStatus?: "ALL" | ReportStatus
  onStatusChange?: (status: "ALL" | ReportStatus) => void
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  selectedDays?: string
  onDaysChange?: (days: string) => void
  currentPage?: number
  totalPages?: number
  totalItems?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onRefresh?: () => void
}

export function ReportTrackingTable({
  items,
  statusCounts,
  categories = [],
  isLoading = false,
  search: controlledSearch,
  onSearchChange,
  selectedStatus: controlledStatus,
  onStatusChange,
  selectedCategory: controlledCategory,
  onCategoryChange,
  selectedDays: controlledDays,
  onDaysChange,
  currentPage: controlledCurrentPage,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  onRefresh,
}: ReportTrackingTableProps) {
  const [internalSearch, setInternalSearch] = useState("")
  const [internalStatus, setInternalStatus] = useState<"ALL" | ReportStatus>(
    "ALL"
  )
  const [internalCategory, setInternalCategory] = useState("all")
  const [internalDays, setInternalDays] = useState("30")
  const [internalPage, setInternalPage] = useState(1)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const search =
    controlledSearch !== undefined ? controlledSearch : internalSearch
  const selectedStatus =
    controlledStatus !== undefined ? controlledStatus : internalStatus
  const selectedCategory =
    controlledCategory !== undefined ? controlledCategory : internalCategory
  const selectedDays =
    controlledDays !== undefined ? controlledDays : internalDays
  const currentPage =
    controlledCurrentPage !== undefined ? controlledCurrentPage : internalPage

  const handleSearchChange = (val: string) => {
    if (onSearchChange) onSearchChange(val)
    else setInternalSearch(val)
  }

  const handleStatusChange = (val: "ALL" | ReportStatus) => {
    if (onStatusChange) onStatusChange(val)
    else setInternalStatus(val)
  }

  const handleCategoryChange = (val: string) => {
    if (onCategoryChange) onCategoryChange(val)
    else setInternalCategory(val)
  }

  const handleDaysChange = (val: string) => {
    if (onDaysChange) onDaysChange(val)
    else setInternalDays(val)
  }

  const handlePageChange = (val: number) => {
    if (onPageChange) onPageChange(val)
    else setInternalPage(val)
  }

  const filterPills: {
    status: "ALL" | ReportStatus
    label: string
    count: number
    dotColor: string
  }[] = [
    {
      status: "ALL",
      label: "Tất cả",
      count: statusCounts?.all ?? totalItems ?? items.length,
      dotColor: "bg-foreground/70",
    },
    {
      status: "PENDING",
      label: "Đang chờ duyệt",
      count: statusCounts?.pending ?? 0,
      dotColor: "bg-amber-500 dark:bg-amber-400",
    },
    {
      status: "IN_REVIEW",
      label: "Đang kiểm duyệt",
      count: statusCounts?.inReview ?? 0,
      dotColor: "bg-sky-500 dark:bg-sky-400",
    },
    {
      status: "APPROVED",
      label: "Đã vào Blacklist",
      count: statusCounts?.approvedBlacklist ?? 0,
      dotColor: "bg-emerald-500 dark:bg-emerald-400",
    },
    {
      status: "WITHDRAWN",
      label: "Đã thu hồi",
      count: statusCounts?.withdrawn ?? 0,
      dotColor: "bg-muted-foreground/70",
    },
    {
      status: "REJECTED",
      label: "Bị từ chối",
      count: statusCounts?.rejected ?? 0,
      dotColor: "bg-rose-500 dark:bg-rose-400",
    },
  ]

  const pageTokens = buildReportPageRange(currentPage, totalPages)

  return (
    <div className="space-y-4">
      {/* Search Bar & Dropdown Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Search */}
        <div className="relative sm:col-span-12 lg:col-span-6">
          <MagnifyingGlass
            aria-hidden="true"
            size={16}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && search) {
                handleSearchChange("")
              }
            }}
            aria-label="Tìm kiếm báo cáo"
            placeholder="Tìm số điện thoại, tài khoản ngân hàng, tên miền..."
            className="min-h-10 w-full rounded-lg border border-black/10 bg-card py-2 pr-9 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" size={14} weight="bold" />
            </button>
          )}
        </div>

        {/* Category select */}
        <div className="relative sm:col-span-6 lg:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            aria-label="Lọc theo danh mục thủ đoạn"
            className="min-h-10 w-full appearance-none rounded-lg border border-black/10 bg-card py-2 pr-9 pl-3.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          >
            <option value="all">Tất cả danh mục thủ đoạn</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </option>
            ))}
          </select>
          <CaretDown
            aria-hidden="true"
            size={14}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        {/* Time select */}
        <div className="relative sm:col-span-6 lg:col-span-3">
          <select
            value={selectedDays}
            onChange={(e) => handleDaysChange(e.target.value)}
            aria-label="Lọc theo khoảng thời gian"
            className="min-h-10 w-full appearance-none rounded-lg border border-black/10 bg-card py-2 pr-9 pl-3.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          >
            <option value="30">30 ngày qua</option>
            <option value="7">7 ngày qua</option>
            <option value="90">90 ngày qua</option>
            <option value="all">Toàn bộ thời gian</option>
          </select>
          <CalendarBlank
            aria-hidden="true"
            size={15}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      {/* Sliding Status Filter Tabs */}
      <div
        role="tablist"
        aria-label="Lọc báo cáo theo trạng thái"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-muted/40 p-1.5 dark:border-white/10"
      >
        {filterPills.map((pill, idx) => {
          const isActive = selectedStatus === pill.status
          return (
            <button
              key={pill.status}
              ref={(el) => {
                tabRefs.current[idx] = el
              }}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleStatusChange(pill.status)}
              onKeyDown={(e) => {
                const nextIdx = getNextTabIndex(idx, filterPills.length, e.key)
                if (nextIdx !== null) {
                  e.preventDefault()
                  handleStatusChange(filterPills[nextIdx].status)
                  tabRefs.current[nextIdx]?.focus()
                }
              }}
              className={cn(
                "relative inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="report-status-tab-indicator"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg border border-black/10 bg-card shadow-xs dark:border-white/12"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 size-2 shrink-0 rounded-full",
                  pill.dotColor
                )}
              />
              <span className="relative z-10">{pill.label}</span>
              <span className="relative z-10 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                {pill.count.toLocaleString("vi-VN")}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-card shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
        {/* Table Title Bar */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-sm font-bold tracking-[-0.02em] text-foreground">
              Tiến trình phê duyệt báo cáo
            </h2>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {totalItems.toLocaleString("vi-VN")} mục
            </span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              aria-label="Làm mới danh sách"
            >
              <div className={cn(isLoading && "motion-safe:animate-spin")}>
                <ArrowsClockwise aria-hidden="true" size={16} weight="bold" />
              </div>
            </button>
          )}
        </div>

        <RecentReportsTable
          embedded
          isLoading={isLoading}
          onRefresh={onRefresh}
          items={items.map((item) => ({
            id: String(item.rawId ?? item.id),
            targetValue: item.targetValue,
            targetType:
              item.targetType === "BANK"
                ? "BANK_ACCOUNT"
                : item.targetType === "WEBSITE"
                  ? "WEBSITE"
                  : "PHONE",
            category: item.category,
            submittedDate: item.submittedDate,
            evidenceCount: Number(item.evidenceBadge.match(/\d+/)?.[0] ?? 0),
            status: item.status,
            rewardPoints: null,
          }))}
        />

        {/* Footer Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5">
          <p className="text-xs text-muted-foreground tabular-nums">
            Trang {currentPage} / {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>
            {pageTokens.map((token) =>
              typeof token === "number" ? (
                <button
                  key={token}
                  type="button"
                  onClick={() => handlePageChange(token)}
                  disabled={isLoading}
                  aria-current={currentPage === token ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    currentPage === token
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {token}
                </button>
              ) : (
                <span
                  key={token}
                  aria-hidden="true"
                  className="px-1.5 text-xs text-muted-foreground"
                >
                  …
                </span>
              )
            )}
            <button
              type="button"
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages || isLoading}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
