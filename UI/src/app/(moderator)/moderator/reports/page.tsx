"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "react-toastify"
import {
  ModeratorReportItem,
  QueueFilterTab,
  ModerationDecisionPayload,
  ModeratorQueueCounts,
} from "@/features/moderator/types/moderator.types"
import {
  getModeratorReportQueue,
  getModeratorQueueCounts,
  getModeratorReportById,
  submitModerationDecision,
} from "@/features/moderator/services/moderator-report.service"
import { ReportQueueFilters } from "@/components/features/moderator/report-queue-filters"
import { ReportQueueItemCard } from "@/components/features/moderator/report-queue-item-card"
import { ReportQueueDetailView } from "@/components/features/moderator/report-queue-detail-view"

export default function ModeratorReportsPage() {
  const [items, setItems] = useState<ModeratorReportItem[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [selectedDetail, setSelectedDetail] = useState<ModeratorReportItem | null>(null)
  const [currentTab, setCurrentTab] = useState<QueueFilterTab>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [debouncedSearch, setDebouncedSearch] = useState<string>("")
  const [counts, setCounts] = useState<ModeratorQueueCounts>({
    all: 0,
    pending: 0,
    inReview: 0,
    locked: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch report queue and tab counts
  useEffect(() => {
    let isCancelled = false
    async function loadQueueAndCounts() {
      setIsLoading(true)
      try {
        const [queueRes, countsRes] = await Promise.all([
          getModeratorReportQueue({
            tab: currentTab,
            search: debouncedSearch,
          }),
          getModeratorQueueCounts(),
        ])

        if (!isCancelled) {
          const reportList = queueRes.data || []
          setItems(reportList)
          setCounts(countsRes)

          // Keep selection if exists, else select the first item
          if (reportList.length > 0) {
            setSelectedId((prev) => {
              const stillExists = reportList.some((item) => item.id === prev)
              return stillExists ? prev : reportList[0].id
            })
          } else {
            setSelectedId("")
            setSelectedDetail(null)
          }
        }
      } catch (err) {
        if (!isCancelled) {
          toast.error("Không thể tải danh sách hàng đợi báo cáo")
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadQueueAndCounts()
    return () => {
      isCancelled = true
    }
  }, [currentTab, debouncedSearch, refreshTrigger])

  // Fetch detailed information whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      return
    }

    const currentItem = items.find((i) => i.id === selectedId) || null
    setSelectedDetail(currentItem)

    let isCancelled = false
    getModeratorReportById(selectedId)
      .then((detail) => {
        if (!isCancelled && detail) {
          setSelectedDetail(detail)
        }
      })
      .catch((err) => {
        console.warn("Could not fetch fresh detail, using list item:", err)
      })

    return () => {
      isCancelled = true
    }
  }, [selectedId, items])

  // Handle decision submit
  const handleDecisionSubmitted = async (payload: ModerationDecisionPayload) => {
    try {
      const payloadWithDetails: ModerationDecisionPayload = {
        ...payload,
        rawId: selectedDetail?.rawId ?? payload.rawId,
        categoryId: selectedDetail?.categoryId ?? payload.categoryId,
      }

      const res = await submitModerationDecision(payloadWithDetails)
      if (res.success) {
        toast.success(res.message)
        // Refresh queue & counts from backend
        setRefreshTrigger((prev) => prev + 1)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu quyết định kiểm duyệt!"
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 lg:flex-row">
      {/* Left Column: Queue List & Filters */}
      <aside className="flex w-full flex-col border-r border-slate-200 bg-white lg:w-96 lg:min-w-[380px] lg:max-w-[420px] dark:border-slate-800 dark:bg-slate-900">
        <ReportQueueFilters
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          counts={counts}
        />

        {/* Scrollable List Container */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Không tìm thấy hồ sơ phù hợp
            </div>
          ) : (
            items.map((item) => (
              <ReportQueueItemCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onSelect={(selected) => setSelectedId(selected.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Right Column: Case Workspace Detail */}
      <section className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <ReportQueueDetailView
          item={selectedDetail}
          onDecisionSubmitted={handleDecisionSubmitted}
        />
      </section>
    </div>
  )
}
