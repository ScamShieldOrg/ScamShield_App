"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "react-toastify"
import { HistoryFilterBar } from "@/components/features/history/history-filter-bar"
import { HistoryRiskPills } from "@/components/features/history/history-risk-pills"
import { HistoryDataTable } from "@/components/features/history/history-data-table"
import { HistoryPagination } from "@/components/features/history/history-pagination"
import {
  getScamCheckHistory,
  deleteHistoryItems,
} from "@/features/history/services/history.service"
import {
  HistoryItem,
  HistoryRiskStatus,
  ScamCheckRiskCounts,
} from "@/features/history/types/history.types"

export default function UserHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [riskCounts, setRiskCounts] = useState<ScamCheckRiskCounts | null>(null)
  const [periodLabel, setPeriodLabel] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [timeRange, setTimeRange] = useState("30_days")
  const [scamType, setScamType] = useState("all")
  const [riskStatus, setRiskStatus] = useState<"ALL" | HistoryRiskStatus>("ALL")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Track initial load to prevent empty flicker
  const hasLoadedRef = useRef(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Clear selections whenever filters or pagination change
  useEffect(() => {
    setSelectedIds([])
  }, [debouncedSearch, timeRange, scamType, riskStatus, currentPage])

  // Fetch history data with race condition handling
  useEffect(() => {
    let ignore = false
    setIsLoading(true)

    getScamCheckHistory({
      search: debouncedSearch,
      timeRange,
      scamType,
      riskStatus,
      page: currentPage - 1,
      size: 10,
    })
      .then((response) => {
        if (!ignore) {
          const paginatedItems = response.items?.data || []
          setItems(paginatedItems)
          setTotalPages(response.items?.totalPages || 1)
          setTotalItems(response.items?.totalItems || 0)
          setRiskCounts(response.riskCounts)
          if (response.periodLabel) {
            setPeriodLabel(response.periodLabel)
          }
          hasLoadedRef.current = true
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error("Error fetching check history:", error)
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể tải lịch sử kiểm tra"
          )
          if (!hasLoadedRef.current) {
            setItems([])
            setTotalPages(1)
            setTotalItems(0)
            setRiskCounts(null)
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [debouncedSearch, timeRange, scamType, riskStatus, currentPage, refreshKey])

  // Reset to page 1 on filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    setCurrentPage(1)
  }

  const handleScamTypeChange = (value: string) => {
    setScamType(value)
    setCurrentPage(1)
  }

  const handleRiskStatusChange = (status: "ALL" | HistoryRiskStatus) => {
    setRiskStatus(status)
    setCurrentPage(1)
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    const currentPageIds = items.map((item) => item.id)
    const isAllPageSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedIds.includes(id))

    if (isAllPageSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentPageIds)
    }
  }

  // Count items selected strictly on the current page
  const selectedOnCurrentPageCount = items.filter((item) =>
    selectedIds.includes(item.id)
  ).length

  const handleDeleteSelected = async () => {
    const targetIds = selectedIds.filter((id) =>
      items.some((item) => item.id === id)
    )
    if (targetIds.length === 0) return

    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa ${targetIds.length} bản ghi lịch sử kiểm tra đã chọn?`
    )
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      await deleteHistoryItems(targetIds)
      toast.success(`Đã xóa ${targetIds.length} mục lịch sử thành công`)
      setSelectedIds([])
      // Refetch page via refreshKey
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xóa lịch sử thất bại"
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Top Action Filters */}
      <HistoryFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        scamType={scamType}
        onScamTypeChange={handleScamTypeChange}
        selectedCount={selectedOnCurrentPageCount}
        onDeleteSelected={handleDeleteSelected}
        isDeleting={isDeleting}
      />

      {/* Risk Filter Pills */}
      <HistoryRiskPills
        currentStatus={riskStatus}
        onSelectStatus={handleRiskStatusChange}
        counts={riskCounts}
      />

      {/* Data Table */}
      <HistoryDataTable
        items={items}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        isLoading={isLoading}
      />

      {/* Pagination Controls */}
      <HistoryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={10}
        periodLabel={periodLabel}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
