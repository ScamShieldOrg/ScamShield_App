"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import type {
  ModeratorReportItem,
  QueueFilterTab,
  ModerationDecisionPayload,
  ModeratorQueueCounts,
} from "@/features/moderator/types/moderator.types"
import {
  getModeratorReportQueue,
  getModeratorQueueCounts,
  getModeratorReportById,
  startModeratorReportReview,
  submitModerationDecision,
  ModerationApiError,
} from "@/features/moderator/services/moderator-report.service"
import { ReportQueueFilters } from "./report-queue-filters"
import { ReportQueueItemCard } from "./report-queue-item-card"
import { ModeratorDashboard } from "@/components/features/moderator/moderator-dashboard"
import { ReportQueueDetailView } from "./report-queue-detail-view"

const REPORT_PAGE_SIZE = 10

export function ReportReviewWorkspace({
  initialId = "",
}: {
  initialId?: string
}) {
  const [items, setItems] = useState<ModeratorReportItem[]>([])
  const [selected, setSelected] = useState("")
  const [activeReviewId, setActiveReviewId] = useState("")
  const [detailResult, setDetailResult] = useState<{
    key: string
    data: ModeratorReportItem | null
    error: string
  }>({ key: "", data: null, error: "" })
  const [tab, setTab] = useState<QueueFilterTab>("PENDING")
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(0)
  const [counts, setCounts] = useState<ModeratorQueueCounts>({
    all: 0,
    pending: 0,
    inReview: 0,
    locked: 0,
  })
  const [revision, setRevision] = useState(0)
  const [resolvedQueueKey, setResolvedQueueKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [queueError, setQueueError] = useState("")
  const queueKey = JSON.stringify([tab, query, page, revision])
  const detailKey = JSON.stringify([selected, revision])
  const loading = resolvedQueueKey !== queueKey
  const detailLoading = Boolean(selected) && detailResult.key !== detailKey
  const detail =
    selected && detailResult.key === detailKey ? detailResult.data : null
  const detailError = detailResult.key === detailKey ? detailResult.error : ""
  const setDetail = (data: ModeratorReportItem | null) =>
    setDetailResult({ key: detailKey, data, error: "" })
  const actionInFlight = useRef(false)
  useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined
    if (!initialId || navigation?.type === "reload") return
    let active = true
    queueMicrotask(() => {
      if (active) setSelected(initialId)
    })
    return () => {
      active = false
    }
  }, [initialId])
  const reviewingId = useRef<string | number | null>(null)
  const formDirty = useRef(false)
  const handleDirtyChange = useCallback((dirty: boolean) => {
    formDirty.current = dirty
  }, [])
  const leaveMessage =
    "Thông tin đang cập nhật có thể bị mất. Bạn có muốn tiếp tục?"
  const leaveReview = () => {
    const current = reviewingId.current
    if (current == null) {
      setActiveReviewId("")
      return true
    }
    if (actionInFlight.current) return false
    if (formDirty.current && !window.confirm(leaveMessage)) return false
    formDirty.current = false
    reviewingId.current = null
    setActiveReviewId("")
    return true
  }
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (reviewingId.current == null || !formDirty.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    const pageHide = () => {
      formDirty.current = false
      reviewingId.current = null
    }
    const pageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      reviewingId.current = null
      formDirty.current = false
      setSelected("")
      setActiveReviewId("")
      setRevision((value) => value + 1)
    }
    window.addEventListener("beforeunload", beforeUnload)
    window.addEventListener("pagehide", pageHide)
    window.addEventListener("pageshow", pageShow)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      window.removeEventListener("pagehide", pageHide)
      window.removeEventListener("pageshow", pageShow)
      pageHide()
    }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search)
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => {
    let active = true
    void Promise.all([
      getModeratorReportQueue({
        tab,
        search: query,
        page,
        size: REPORT_PAGE_SIZE,
      }),
      getModeratorQueueCounts(),
    ])
      .then(([result, totals]) => {
        if (!active) return
        setItems(result.data)
        setQueueError("")
        setCounts(totals)
        setPages(result.totalPages)
      })
      .catch((e) => {
        if (active) {
          setQueueError(
            e instanceof Error ? e.message : "Không thể tải hàng đợi"
          )
          setItems([])
        }
      })
      .finally(() => {
        if (active) setResolvedQueueKey(queueKey)
      })
    return () => {
      active = false
    }
  }, [tab, query, page, revision, queueKey])
  useEffect(() => {
    if (!selected) return
    let active = true
    void getModeratorReportById(selected)
      .then(async (result) => {
        if (!active) return
        const report = result
        if (!active) return
        if (report.status !== "In Review" || report.canReview !== true) {
          reviewingId.current = null
        }
        setDetailResult({ key: detailKey, data: report, error: "" })
        setItems((previous) =>
          previous.map((item) => (item.id === report.id ? report : item))
        )
        void getModeratorQueueCounts()
          .then((totals) => {
            if (active) setCounts(totals)
          })
          .catch(() => {})
      })
      .catch((e) => {
        if (active)
          setDetailResult({
            key: detailKey,
            data: null,
            error: e instanceof Error ? e.message : "Không thể tải chi tiết",
          })
      })
    return () => {
      active = false
    }
  }, [selected, revision, detailKey])
  const startReview = async () => {
    if (
      !detail ||
      !["Pending", "In Review"].includes(detail.status) ||
      actionInFlight.current
    )
      return
    actionInFlight.current = true
    setBusy(true)
    try {
      const report = await startModeratorReportReview(detail.rawId ?? detail.id)
      setDetail(report)
      setActiveReviewId(report.id)
      reviewingId.current = report.rawId ?? report.id
      setRevision((value) => value + 1)
      toast.success("Đã bắt đầu duyệt báo cáo")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể bắt đầu duyệt"
      )
      setRevision((value) => value + 1)
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }
  const act = async (decision: ModerationDecisionPayload) => {
    if (!detail || actionInFlight.current) return
    actionInFlight.current = true
    setBusy(true)
    try {
      {
        const result = await submitModerationDecision({
          ...decision,
          rawId: detail.rawId,
        })
        setDetail(result.data)
        reviewingId.current = null
        setActiveReviewId("")
        formDirty.current = false
        toast.success(result.message)
      }
      setRevision((value) => value + 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại")
      if (e instanceof ModerationApiError && e.status === 409) {
        reviewingId.current = null
        setDetail(null)
      }
      setRevision((value) => value + 1)
    } finally {
      actionInFlight.current = false
      setBusy(false)
    }
  }
  return (
    <div
      data-report-workspace
      className="flex flex-1 flex-col bg-background text-foreground lg:min-h-0 lg:flex-row"
    >
      <aside className="w-full border-r border-border lg:w-96 lg:shrink-0">
        <fieldset
          disabled={busy || detailLoading}
          className="min-w-0 lg:h-full"
        >
          <div className="flex flex-col lg:h-full">
            <ReportQueueFilters
              currentTab={tab}
              onTabChange={(value) => {
                setTab(value)
                setPage(0)
              }}
              searchQuery={search}
              onSearchChange={setSearch}
              counts={counts}
            />
            <div
              key={JSON.stringify([tab, query, page])}
              className="min-h-0 flex-1 space-y-3 p-4 lg:overflow-y-auto lg:overscroll-contain"
              aria-busy={loading}
            >
              {!loading && queueError ? (
                <p role="alert" className="text-sm text-destructive">
                  {queueError}
                </p>
              ) : loading ? (
                <p className="text-sm text-muted-foreground">
                  Đang tải hàng đợi...
                </p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có báo cáo phù hợp.
                </p>
              ) : (
                items.map((item) => (
                  <ReportQueueItemCard
                    key={item.id}
                    item={item}
                    isSelected={
                      selected === item.id || String(item.rawId) === selected
                    }
                    onSelect={async (value) => {
                      if (
                        value.id === selected ||
                        String(value.rawId) === selected
                      )
                        return
                      if (await leaveReview()) setSelected(value.id)
                    }}
                  />
                ))
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-4 text-xs">
              <button
                type="button"
                disabled={loading || page === 0}
                onClick={() => setPage((value) => value - 1)}
                className="rounded border border-border p-2 disabled:opacity-40"
              >
                Trang trước
              </button>
              <div className="text-center tabular-nums">
                <p>
                  Trang {pages ? page + 1 : 0}/{pages}
                </p>
                {!loading && !queueError && (
                  <p className="mt-1 text-muted-foreground">
                    {items.length}/{REPORT_PAGE_SIZE} báo cáo
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={loading || page + 1 >= pages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded border border-border p-2 disabled:opacity-40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </fieldset>
      </aside>
      <section
        className="min-w-0 flex-1 lg:overflow-y-auto lg:overscroll-contain"
        aria-label="Chi tiết báo cáo"
        aria-busy={busy || detailLoading}
        tabIndex={0}
      >
        <button
          type="button"
          disabled={busy || loading || detailLoading}
          onClick={() => setRevision((value) => value + 1)}
          className="m-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <ArrowClockwiseIcon
            size={18}
            className={loading || detailLoading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          {loading || detailLoading ? "Đang làm mới..." : "Làm mới"}
        </button>
        {detailError && (
          <p role="alert" className="px-5 text-sm text-destructive">
            {detailError}
          </p>
        )}
        {!selected ? (
          <ModeratorDashboard key={revision} />
        ) : detailLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Đang tải hồ sơ...</p>
        ) : (
          <ReportQueueDetailView
            key={detail?.id ?? selected}
            item={detail}
            busy={busy}
            reviewActive={detail?.id === activeReviewId}
            onStartReview={startReview}
            onDirtyChange={handleDirtyChange}
            onDecisionSubmitted={(payload) => act(payload)}
          />
        )}
      </section>
    </div>
  )
}
