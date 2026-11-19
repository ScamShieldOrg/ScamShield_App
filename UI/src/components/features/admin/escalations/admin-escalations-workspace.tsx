"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { EscalationQueue } from "./escalation-queue"
import { EscalationDetail } from "./escalation-detail"
import { EscalationDecisionPanel } from "./escalation-decision-panel"
import {
  adminAbuseEscalationService,
  type AdminAbuseEscalationItem,
  type AdminAbuseEscalationDetail,
  type AbuseEscalationDecision,
  formatDateTime,
} from "@/features/admin/services/admin-abuse-escalations"
import { CheckCircle, WarningCircle } from "@phosphor-icons/react"

const statusBadges: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "CHỜ DUYỆT",
    className:
      "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  OPEN: {
    label: "ĐANG THEO DÕI",
    className:
      "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  },
  DISMISSED: {
    label: "ĐÃ BÁC BỎ",
    className:
      "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
}

export function AdminEscalationsWorkspace() {
  const [queueItems, setQueueItems] = useState<AdminAbuseEscalationItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<AdminAbuseEscalationDetail | null>(null)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING")

  const [isLoadingQueue, setIsLoadingQueue] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load Queue from Backend API
  const loadQueue = useCallback(async () => {
    setIsLoadingQueue(true)
    setErrorMessage(null)
    try {
      const response = await adminAbuseEscalationService.getQueue({
        status: filter,
        search: search.trim() || undefined,
        size: 50,
      })
      const items = response.data || []
      setQueueItems(items)

      // Auto-select first item if current selection not in items
      if (items.length > 0) {
        setSelectedId((current) => {
          if (current && items.some((i) => i.id === current)) {
            return current
          }
          return items[0].id
        })
      } else {
        setSelectedId(null)
        setSelectedDetail(null)
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể tải danh sách hồ sơ lạm dụng."
      )
    } finally {
      setIsLoadingQueue(false)
    }
  }, [filter, search])

  // Load detail when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      return
    }

    let isMounted = true
    setIsLoadingDetail(true)
    adminAbuseEscalationService
      .getDetail(selectedId)
      .then((detail) => {
        if (isMounted) setSelectedDetail(detail)
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : "Không thể tải chi tiết hồ sơ."
          )
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedId])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQueue()
    }, 250)
    return () => clearTimeout(timer)
  }, [loadQueue])

  // Submit Admin Decision to Backend API
  async function handleDecision(decision: AbuseEscalationDecision, reason: string) {
    if (!selectedId) return
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      await adminAbuseEscalationService.decide(selectedId, {
        decision,
        reason,
      })
      setSuccessMessage(
        `Đã lưu quyết định xử lý cho hồ sơ ESC-${String(selectedId).padStart(4, "0")}.`
      )
      // Refresh detail and queue
      const updatedDetail = await adminAbuseEscalationService.getDetail(selectedId)
      setSelectedDetail(updatedDetail)
      await loadQueue()
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu quyết định."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = queueItems.filter((item) => item.status === "PENDING").length
  const currentStatus = selectedDetail?.escalation.status || "PENDING"
  const badgeInfo = statusBadges[currentStatus] || statusBadges.PENDING

  return (
    <div className="mx-auto max-w-[1800px] overflow-hidden rounded-xl border border-border bg-background shadow-xs">
      {/* Toast Feedback Banners */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-6 py-2.5 text-xs font-medium text-destructive"
        >
          <WarningCircle size={16} className="shrink-0" weight="fill" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Đóng
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle size={16} className="shrink-0" weight="fill" />
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="grid min-w-0 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left column: Escalation Queue */}
        <EscalationQueue
          cases={queueItems}
          selectedId={selectedId}
          pendingCount={pendingCount}
          search={search}
          filter={filter}
          isLoading={isLoadingQueue}
          onSearch={setSearch}
          onFilter={setFilter}
          onSelect={setSelectedId}
        />

        {/* Center & Right column workspace */}
        <div className="min-w-0 bg-background p-4 sm:p-6 lg:p-7">
          {/* Breadcrumb matching Image 2 */}
          <nav
            aria-label="Breadcrumb"
            className="mb-2 text-[10px] font-mono tracking-wider text-muted-foreground uppercase"
          >
            QUẢN TRỊ VIÊN / LẠM DỤNG TÀI KHOẢN
          </nav>

          {/* Header matching Image 2 */}
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Xem xét báo cáo lạm dụng tài khoản
              </h1>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {selectedDetail
                  ? `${selectedDetail.escalation.escalationCode} · Kiểm duyệt viên ${
                      selectedDetail.escalation.createdByName || "Mai Phương"
                    } gửi · ${formatDateTime(selectedDetail.escalation.createdAt)}`
                  : "Chọn hồ sơ để xem xét"}
              </p>
            </div>
            {selectedDetail && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
                  badgeInfo.className
                )}
              >
                {badgeInfo.label}
              </span>
            )}
          </header>

          {/* Grid layout matching Image 2: Center Details + Right Decision Panel */}
          <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,36%)]">
            <EscalationDetail detail={selectedDetail} isLoading={isLoadingDetail} />
            <EscalationDecisionPanel
              key={selectedId ?? "empty"}
              caseId={selectedId}
              status={selectedDetail?.escalation.status ?? null}
              userStatus={selectedDetail?.escalation.userStatus ?? null}
              isSubmitting={isSubmitting}
              onSubmit={handleDecision}
            />
          </div>

          {/* Bottom audit line matching Image 2 */}
          <p className="pt-6 text-[11px] text-muted-foreground">
            Bằng chứng và mọi thao tác quản trị đều được lưu sổ kiểm toán.
          </p>
        </div>
      </div>
    </div>
  )
}
