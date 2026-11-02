"use client"

import { RecentReportsTable } from "./recent-reports-table"
import { useState } from "react"
import {
  MagnifyingGlass,
  CaretDown,
  CalendarBlank,
  ArrowsClockwise,
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
      dotColor: "bg-white",
    },
    {
      status: "PENDING",
      label: "Đang chờ duyệt",
      count: statusCounts?.pending ?? 0,
      dotColor: "bg-[#F59E0B]",
    },
    {
      status: "APPROVED_BLACKLIST",
      label: "Đã vào Blacklist",
      count: statusCounts?.approvedBlacklist ?? 0,
      dotColor: "bg-[#10B981]",
    },
    {
      status: "MERGED_DUPLICATE",
      label: "Đã gộp trùng lặp",
      count: statusCounts?.mergedDuplicate ?? 0,
      dotColor: "bg-[#64748B]",
    },
    {
      status: "WITHDRAWN",
      label: "Đã thu hồi",
      count: statusCounts?.withdrawn ?? 0,
      dotColor: "bg-slate-400",
    },
    {
      status: "REJECTED",
      label: "Bị từ chối",
      count: statusCounts?.rejected ?? 0,
      dotColor: "bg-[#EF4444]",
    },
  ]

  return (
    <div className="space-y-4">
      {/* Search Bar & Dropdown Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Search */}
        <div className="relative sm:col-span-6 lg:col-span-7">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Tìm số điện thoại, tài khoản ngân hàng, tên miền..."
            className="w-full rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-4 pl-9 text-xs text-[#131B2E] placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground"
          />
        </div>

        {/* Category select */}
        <div className="lg:col-span-2.5 relative sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-8 pl-3.5 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground"
          >
            <option value="all">Tất cả danh mục thủ đoạn</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </option>
            ))}
          </select>
          <CaretDown
            size={13}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
        </div>

        {/* Time select */}
        <div className="lg:col-span-2.5 relative sm:col-span-3">
          <select
            value={selectedDays}
            onChange={(e) => handleDaysChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[#C6C6CE]/50 bg-white py-2.5 pr-8 pl-3.5 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-card dark:text-foreground"
          >
            <option value="30">30 ngày qua</option>
            <option value="7">7 ngày qua</option>
            <option value="90">90 ngày qua</option>
            <option value="all">Toàn bộ thời gian</option>
          </select>
          <CalendarBlank
            size={15}
            weight="bold"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filterPills.map((pill) => {
          const isActive = selectedStatus === pill.status
          return (
            <button
              key={pill.status}
              type="button"
              onClick={() => handleStatusChange(pill.status)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all",
                isActive
                  ? "border-[#0B132B] bg-[#0B132B] text-white dark:bg-primary dark:text-primary-foreground"
                  : "border-[#C6C6CE]/50 bg-white text-[#131B2E] hover:bg-[#FAF8FF] dark:border-border dark:bg-card dark:text-foreground"
              )}
            >
              <span className={cn("size-2 rounded-full", pill.dotColor)} />
              <span>{pill.label}</span>
              <span
                className={cn(
                  "py-0.2 rounded-full px-1.5 text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[#F2F3FF] text-[#45464D] dark:bg-muted dark:text-muted-foreground"
                )}
              >
                {pill.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[#C6C6CE]/40 bg-white shadow-xs dark:border-border dark:bg-card">
        {/* Table Title Bar */}
        <div className="flex items-center justify-between border-b border-[#C6C6CE]/30 px-5 py-3.5 dark:border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-bold text-[#131B2E] dark:text-foreground">
              Bảng Quản Lý Tiến Trình Phê Duyệt
            </h3>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[#45464D] hover:bg-[#F2F3FF] hover:text-[#131B2E] dark:text-muted-foreground dark:hover:bg-muted"
              aria-label="Làm mới"
            >
              <ArrowsClockwise
                size={16}
                weight="bold"
                className={cn(isLoading && "animate-spin")}
              />
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
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#C6C6CE]/30 px-5 py-3 dark:border-border">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-lg border border-[#C6C6CE]/50 bg-white px-2.5 py-1 text-xs font-semibold text-[#45464D] hover:bg-[#FAF8FF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card dark:text-muted-foreground"
            >
              Trang trước
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const p = idx + 1
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  disabled={isLoading}
                  className={cn(
                    "flex size-7 cursor-pointer items-center justify-center rounded-lg text-xs font-bold shadow-2xs transition-all",
                    currentPage === p
                      ? "bg-[#0B132B] text-white dark:bg-primary dark:text-primary-foreground"
                      : "border border-[#C6C6CE]/50 bg-white text-[#131B2E] hover:bg-[#FAF8FF] dark:border-border dark:bg-card dark:text-foreground"
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages || isLoading}
              className="rounded-lg border border-[#C6C6CE]/50 bg-white px-2.5 py-1 text-xs font-semibold text-[#45464D] hover:bg-[#FAF8FF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card dark:text-muted-foreground"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
