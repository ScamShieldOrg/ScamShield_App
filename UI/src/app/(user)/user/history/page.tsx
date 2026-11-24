"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { ArrowCounterClockwise, Trash } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { HistoryFilterBar } from "@/components/features/history/history-filter-bar"
import { HistoryRiskPills } from "@/components/features/history/history-risk-pills"
import { HistoryDataTable } from "@/components/features/history/history-data-table"
import { HistoryPagination } from "@/components/features/history/history-pagination"
import {
  DEFAULT_HISTORY_SCAM_TYPE,
  DEFAULT_HISTORY_TIME_RANGE,
  hasActiveHistoryFilters,
} from "@/components/features/history/history-helpers"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
import {
  getScamCheckHistory,
  deleteHistoryItems,
} from "@/features/history/services/history.service"
import type {
  HistoryItem,
  HistoryRiskStatus,
  ScamCheckRiskCounts,
} from "@/features/history/types/history.types"

const UNDO_SECONDS = 6

interface PendingDelete {
  ids: string[]
  count: number
}

export default function UserHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [riskCounts, setRiskCounts] = useState<ScamCheckRiskCounts | null>(null)
  const [periodLabel, setPeriodLabel] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [timeRange, setTimeRange] = useState(DEFAULT_HISTORY_TIME_RANGE)
  const [scamType, setScamType] = useState(DEFAULT_HISTORY_SCAM_TYPE)
  const [riskStatus, setRiskStatus] = useState<"ALL" | HistoryRiskStatus>("ALL")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [lastFailedDelete, setLastFailedDelete] =
    useState<PendingDelete | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(UNDO_SECONDS)
  const [hasLoaded, setHasLoaded] = useState(false)

  const requestKey = `${debouncedSearch}|${timeRange}|${scamType}|${riskStatus}|${currentPage}|${refreshKey}`
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(
    null
  )
  const isLoading = settledRequestKey !== requestKey

  const hasLoadedRef = useRef(false)
  const pendingDeleteRef = useRef<PendingDelete | null>(null)
  const commitInFlightRef = useRef(false)

  useEffect(() => {
    pendingDeleteRef.current = pendingDelete
  }, [pendingDelete])

  // Debounce search query
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  // Fetch history data with stale-request guard
  useEffect(() => {
    let ignore = false

    getScamCheckHistory({
      search: debouncedSearch,
      timeRange,
      scamType,
      riskStatus,
      page: currentPage - 1,
      size: 10,
    })
      .then((response) => {
        if (ignore) return
        const paginatedItems = response.items?.data || []
        setItems(paginatedItems)
        setTotalPages(response.items?.totalPages || 1)
        setTotalItems(response.items?.totalItems || 0)
        setRiskCounts(response.riskCounts)
        setPeriodLabel(response.periodLabel || "")
        setFetchError(null)
        hasLoadedRef.current = true
        setHasLoaded(true)
        setSettledRequestKey(requestKey)
      })
      .catch((error) => {
        if (ignore) return
        const message =
          error instanceof Error
            ? error.message
            : "Không thể tải lịch sử kiểm tra. Vui lòng thử lại."
        setFetchError(message)
        if (!hasLoadedRef.current) {
          setItems([])
          setTotalPages(1)
          setTotalItems(0)
          setRiskCounts(null)
        }
        setSettledRequestKey(requestKey)
      })

    return () => {
      ignore = true
    }
  }, [
    debouncedSearch,
    timeRange,
    scamType,
    riskStatus,
    currentPage,
    refreshKey,
    requestKey,
  ])

  const commitDelete = useCallback(async (target: PendingDelete) => {
    if (commitInFlightRef.current) return
    commitInFlightRef.current = true
    setPendingDelete(null)
    setDeleteError(null)
    setIsDeleting(true)

    try {
      await deleteHistoryItems(target.ids)
      toast.success(`Đã xóa ${target.count} bản ghi lịch sử`)
      setLastFailedDelete(null)
      setSelectedIds([])
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể xóa các bản ghi đã chọn. Dữ liệu vẫn được giữ nguyên."
      setLastFailedDelete(target)
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
      commitInFlightRef.current = false
    }
  }, [])

  // Countdown for undoable delete bar
  useEffect(() => {
    if (!pendingDelete) return

    const interval = window.setInterval(() => {
      setUndoSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          void commitDelete(pendingDelete)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [pendingDelete, commitDelete])

  // Keyboard Ctrl+Z / Cmd+Z to undo pending delete
  useEffect(() => {
    if (!pendingDelete) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        setPendingDelete(null)
        setUndoSecondsLeft(UNDO_SECONDS)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pendingDelete])

  const visibleItems = useMemo(() => {
    if (!pendingDelete) return items
    const hidden = new Set(pendingDelete.ids)
    return items.filter((item) => !hidden.has(item.id))
  }, [items, pendingDelete])

  const filtersActive = hasActiveHistoryFilters({
    searchQuery,
    timeRange,
    scamType,
    riskStatus,
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleScamTypeChange = (value: string) => {
    setScamType(value)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleRiskStatusChange = (status: "ALL" | HistoryRiskStatus) => {
    setRiskStatus(status)
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedIds([])
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setDebouncedSearch("")
    setTimeRange(DEFAULT_HISTORY_TIME_RANGE)
    setScamType(DEFAULT_HISTORY_SCAM_TYPE)
    setRiskStatus("ALL")
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    const currentPageIds = visibleItems.map((item) => item.id)
    const isAllPageSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedIds.includes(id))

    if (isAllPageSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentPageIds)
    }
  }

  const handleRequestDeleteSelected = () => {
    const targetIds = selectedIds.filter((id) =>
      visibleItems.some((item) => item.id === id)
    )
    if (targetIds.length === 0) return

    if (pendingDeleteRef.current) {
      void commitDelete(pendingDeleteRef.current)
    }

    setDeleteError(null)
    setSelectedIds([])
    setUndoSecondsLeft(UNDO_SECONDS)
    setPendingDelete({ ids: targetIds, count: targetIds.length })
  }

  const handleUndoDelete = () => {
    setPendingDelete(null)
    setUndoSecondsLeft(UNDO_SECONDS)
  }

  const handleRetryFetch = () => {
    setFetchError(null)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto max-w-6xl space-y-6 font-sans antialiased">
        <HistoryFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          scamType={scamType}
          onScamTypeChange={handleScamTypeChange}
          hasActiveFilters={filtersActive}
          onResetFilters={handleResetFilters}
          totalItems={hasLoaded ? totalItems : undefined}
        />

        <HistoryRiskPills
          currentStatus={riskStatus}
          onSelectStatus={handleRiskStatusChange}
          counts={riskCounts}
        />

        <AnimatePresence initial={false}>
          {pendingDelete && (
            <motion.div
              key="history-undo-bar"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100"
            >
              <div className="flex items-center gap-2.5 text-sm">
                <Trash
                  aria-hidden="true"
                  size={18}
                  weight="bold"
                  className="shrink-0 text-amber-800 dark:text-amber-300"
                />
                <p className="leading-relaxed">
                  Sẽ xóa{" "}
                  <strong className="tabular-nums">
                    {pendingDelete.count}
                  </strong>{" "}
                  bản ghi lịch sử sau{" "}
                  <strong className="font-mono tabular-nums">
                    {undoSecondsLeft}s
                  </strong>{" "}
                  <span className="hidden text-xs opacity-80 sm:inline">
                    (nhấn Ctrl+Z để hoàn tác)
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndoDelete}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ArrowCounterClockwise
                    aria-hidden="true"
                    size={14}
                    weight="bold"
                  />
                  <span>Hoàn tác</span>
                </button>
                <button
                  type="button"
                  onClick={() => void commitDelete(pendingDelete)}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-700/25 bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-amber-300/25"
                >
                  <span>Xóa ngay</span>
                </button>
              </div>
            </motion.div>
          )}

          {fetchError && (
            <ScamErrorCallout
              key="history-fetch-error"
              title="Không thể tải lịch sử kiểm tra"
              message={fetchError}
              preserveDraftHint={false}
              onRetry={handleRetryFetch}
              isBusy={isLoading}
            />
          )}

          {deleteError && (
            <ScamErrorCallout
              key="history-delete-error"
              title="Chưa thể xóa bản ghi đã chọn"
              message={deleteError}
              preserveDraftHint={false}
              onRetry={() => {
                if (lastFailedDelete) {
                  void commitDelete(lastFailedDelete)
                } else {
                  setDeleteError(null)
                }
              }}
              isBusy={isDeleting}
            />
          )}
        </AnimatePresence>

        <HistoryDataTable
          items={visibleItems}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onDeleteSelected={handleRequestDeleteSelected}
          isLoading={isLoading}
          isDeleting={isDeleting}
          hasActiveFilters={filtersActive}
          onResetFilters={handleResetFilters}
        />

        <HistoryPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={10}
          periodLabel={periodLabel}
          onPageChange={handlePageChange}
        />
      </section>
    </MotionConfig>
  )
}
