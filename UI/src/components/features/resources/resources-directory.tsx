"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, MotionConfig } from "motion/react"
import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  ShieldPlus,
  WarningCircle,
} from "@phosphor-icons/react"
import { resourceService } from "@/features/resources/services/resource.service"
import type { BlackItem } from "@/types/resource"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/lib/utils"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
import { ResourcesFilterBar } from "./resources-filter-bar"
import { BlacklistItemRow } from "./blacklist-item-row"
import { WhitelistItemRow } from "./whitelist-item-row"
import { ResourceDetailModal } from "./resource-detail-modal"
import {
  buildResourcePagination,
  categoryFilterToResourceType,
  extractResourceErrorMessage,
  isAbortOrCancelError,
  sortBlacklistItems,
  toWhitelistViewItem,
  type ResourceCategoryFilter,
  type ResourceSortOrder,
  type ResourceTab,
  type WhitelistViewItem,
} from "./resource-helpers"

interface ResourcesDirectoryProps {
  initialSearch: string
  initialTab: ResourceTab
}

const PAGE_SIZE = 5

function ResourcesListSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải danh sách tài nguyên"
      className="divide-y divide-border/70"
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className="motion-safe:animate-pulse flex flex-col justify-between gap-4 p-4 sm:p-5 lg:flex-row lg:items-center"
        >
          <div className="flex w-full items-start gap-3.5">
            <div className="size-10 shrink-0 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-52 rounded-md bg-muted" />
              <div className="h-3.5 w-3/4 max-w-[46ch] rounded-md bg-muted/70" />
              <div className="h-3.5 w-44 rounded-md bg-muted/60" />
            </div>
          </div>
          <div className="h-10 w-32 shrink-0 rounded-lg bg-muted/70" />
        </div>
      ))}
    </div>
  )
}

export function ResourcesDirectory({
  initialSearch,
  initialTab,
}: ResourcesDirectoryProps) {
  const [activeTab, setActiveTab] = useState<ResourceTab>(initialTab)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] =
    useState<ResourceCategoryFilter>("all")
  const [sortOrder, setSortOrder] = useState<ResourceSortOrder>("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [retryKey, setRetryKey] = useState(0)

  const [blacklistData, setBlacklistData] = useState<BlackItem[]>([])
  const [blacklistError, setBlacklistError] = useState<string | null>(null)
  const [blacklistTotal, setBlacklistTotal] = useState<number | undefined>(
    undefined
  )
  const [blacklistTotalPages, setBlacklistTotalPages] = useState(1)

  const [whitelistData, setWhitelistData] = useState<WhitelistViewItem[]>([])
  const [whitelistError, setWhitelistError] = useState<string | null>(null)
  const [whitelistTotal, setWhitelistTotal] = useState<number | undefined>(
    undefined
  )
  const [whitelistTotalPages, setWhitelistTotalPages] = useState(1)

  const [selectedBlacklistItem, setSelectedBlacklistItem] =
    useState<BlackItem | null>(null)
  const [selectedWhitelistItem, setSelectedWhitelistItem] =
    useState<WhitelistViewItem | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const resultsAnchorRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<number | null>(null)

  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const checkHref = token || user ? "/user/check" : "/guest/check"

  const requestKey = `${activeTab}|${debouncedSearch}|${selectedCategory}|${sortOrder}|${currentPage}|${retryKey}`
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(
    null
  )
  const isLoading = settledRequestKey !== requestKey

  // Debounce search input
  useEffect(() => {
    const delay = searchQuery.trim() ? 320 : 0
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  // Cleanup copy feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  // Fetch Blacklist or Whitelist based on activeTab
  useEffect(() => {
    let active = true
    const controller = new AbortController()

    if (activeTab === "blacklist") {
      resourceService
        .getBlackList(
          {
            page: Math.max(0, currentPage - 1),
            size: PAGE_SIZE,
            keyword: debouncedSearch.trim() || undefined,
            resourceType: categoryFilterToResourceType(selectedCategory),
          },
          controller.signal
        )
        .then((res) => {
          if (!active) return
          setBlacklistData(res.data || [])
          setBlacklistTotal(res.totalItems ?? 0)
          setBlacklistTotalPages(Math.max(1, res.totalPages || 1))
          setBlacklistError(null)
          setSettledRequestKey(requestKey)
        })
        .catch((err) => {
          if (!active || isAbortOrCancelError(err)) return
          setBlacklistError(
            extractResourceErrorMessage(
              err,
              "Không thể kết nối đến máy chủ danh sách cảnh báo."
            )
          )
          setSettledRequestKey(requestKey)
        })
    } else {
      resourceService
        .getWhiteList(
          {
            page: Math.max(0, currentPage - 1),
            size: PAGE_SIZE,
            keyword: debouncedSearch.trim() || undefined,
            sortBy: sortOrder === "name" ? "name" : "newest",
          },
          controller.signal
        )
        .then((res) => {
          if (!active) return
          setWhitelistData((res.data || []).map(toWhitelistViewItem))
          setWhitelistTotal(res.totalItems ?? 0)
          setWhitelistTotalPages(Math.max(1, res.totalPages || 1))
          setWhitelistError(null)
          setSettledRequestKey(requestKey)
        })
        .catch((err) => {
          if (!active || isAbortOrCancelError(err)) return
          setWhitelistError(
            extractResourceErrorMessage(
              err,
              "Không thể tải danh bạ xác minh từ máy chủ."
            )
          )
          setSettledRequestKey(requestKey)
        })
    }

    return () => {
      active = false
      controller.abort()
    }
  }, [
    activeTab,
    currentPage,
    debouncedSearch,
    selectedCategory,
    sortOrder,
    retryKey,
    requestKey,
  ])

  const displayedBlacklist = useMemo(
    () => sortBlacklistItems(blacklistData, sortOrder),
    [blacklistData, sortOrder]
  )

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator.clipboard?.writeText !== "function") return
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedKey(null)
      }, 2000)
    })
  }

  const handleTabChange = (nextTab: ResourceTab) => {
    if (nextTab === activeTab) return
    setActiveTab(nextTab)
    setCurrentPage(1)
    if (nextTab === "whitelist" && sortOrder === "reports") {
      setSortOrder("newest")
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleCategoryChange = (category: ResourceCategoryFilter) => {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  const handleSortOrderChange = (order: ResourceSortOrder) => {
    setSortOrder(order)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setDebouncedSearch("")
    setSelectedCategory("all")
    setSortOrder("newest")
    setCurrentPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    const maxPages =
      activeTab === "blacklist" ? blacklistTotalPages : whitelistTotalPages
    if (nextPage < 1 || nextPage > maxPages) return
    setCurrentPage(nextPage)
    resultsAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  const handleRetry = () => {
    if (activeTab === "blacklist") {
      setBlacklistError(null)
    } else {
      setWhitelistError(null)
    }
    setRetryKey((prev) => prev + 1)
  }

  const activeError =
    activeTab === "blacklist" ? blacklistError : whitelistError
  const activeTotal =
    activeTab === "blacklist" ? (blacklistTotal ?? 0) : (whitelistTotal ?? 0)
  const activeTotalPages =
    activeTab === "blacklist" ? blacklistTotalPages : whitelistTotalPages
  const activeCount =
    activeTab === "blacklist" ? displayedBlacklist.length : whitelistData.length

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    (activeTab === "blacklist" && selectedCategory !== "all") ||
    sortOrder !== "newest"

  const paginationTokens = buildResourcePagination(
    currentPage,
    activeTotalPages
  )
  const startItem = activeTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, activeTotal)

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* Subtle Header Region */}
        <section className="relative overflow-hidden border-b border-black/10 bg-muted/30 px-4 pt-10 pb-14 sm:px-6 lg:px-8 dark:border-white/10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-3xl rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
          />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-bold tracking-[-0.025em] text-foreground sm:text-4xl">
                Tra cứu tài nguyên
              </h1>
              <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                Đối chiếu nhanh số điện thoại, đường dẫn, tài khoản ngân hàng
                trong danh sách cảnh báo (Blacklist) hoặc xác nhận kênh liên hệ
                chính thống đã kiểm duyệt (Whitelist).
              </p>
            </div>

            <Link
              href={checkHref}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ShieldPlus aria-hidden="true" size={18} weight="bold" />
              <span>Kiểm tra tin nhắn / URL với AI</span>
            </Link>
          </div>
        </section>

        {/* Main Directory Content */}
        <div className="mx-auto -mt-6 max-w-6xl space-y-6 px-4 pb-20 sm:px-6 lg:px-8">
          <ResourcesFilterBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            blacklistTotal={blacklistTotal}
            whitelistTotal={whitelistTotal}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />

          {/* Recoverable Error State */}
          <AnimatePresence initial={false}>
            {activeError && (
              <ScamErrorCallout
                key={`${activeTab}-error`}
                title={
                  activeTab === "blacklist"
                    ? "Không thể tải danh sách cảnh báo"
                    : "Không thể tải danh bạ xác minh"
                }
                message={activeError}
                preserveDraftHint={false}
                onRetry={handleRetry}
                isBusy={isLoading}
              />
            )}
          </AnimatePresence>

          {/* Directory Results Card */}
          <div
            ref={resultsAnchorRef}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-black/10 bg-card shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"
          >
            {isLoading ? (
              <ResourcesListSkeleton />
            ) : activeCount === 0 && !activeError ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl border border-black/10 bg-muted/40 text-muted-foreground dark:border-white/10">
                  <WarningCircle aria-hidden="true" size={24} weight="duotone" />
                </div>
                <h2 className="mt-4 font-heading text-base font-bold tracking-[-0.02em] text-foreground">
                  {activeTab === "blacklist"
                    ? "Không tìm thấy cảnh báo nào phù hợp"
                    : "Không tìm thấy đơn vị xác minh nào phù hợp"}
                </h2>
                <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
                  {hasActiveFilters
                    ? "Thử đổi từ khóa tra cứu, chuyển loại tài nguyên hoặc đặt lại bộ lọc. Nếu nghi ngờ nội dung mới, bạn có thể phân tích ngay bằng AI."
                    : "Danh sách hiện chưa có bản ghi nào. Bạn vẫn có thể kiểm tra trực tiếp nội dung nghi ngờ bằng công cụ AI."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
                    >
                      <ArrowCounterClockwise
                        aria-hidden="true"
                        size={16}
                        weight="bold"
                      />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  )}
                  <Link
                    href={checkHref}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ShieldPlus aria-hidden="true" size={16} weight="bold" />
                    <span>Kiểm tra với AI</span>
                  </Link>
                </div>
              </div>
            ) : activeTab === "blacklist" ? (
              <ul className="divide-y divide-border/70">
                {displayedBlacklist.map((item) => (
                  <BlacklistItemRow
                    key={item.id}
                    item={item}
                    checkHref={checkHref}
                    onSelectDetail={setSelectedBlacklistItem}
                  />
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-border/70">
                {whitelistData.map((item) => (
                  <WhitelistItemRow
                    key={item.id}
                    item={item}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                    onSelectDetail={setSelectedWhitelistItem}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && activeTotal > 0 && (
            <nav
              aria-label="Phân trang danh bạ tài nguyên"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-muted-foreground tabular-nums">
                Hiển thị{" "}
                <span className="font-semibold text-foreground">
                  {startItem}–{endItem}
                </span>{" "}
                /{" "}
                <span className="font-semibold text-foreground">
                  {activeTotal.toLocaleString("vi-VN")}
                </span>{" "}
                tài nguyên
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Trang trước"
                  className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                >
                  <CaretLeft aria-hidden="true" size={16} weight="bold" />
                </button>

                {paginationTokens.map((token, index) => {
                  if (token === "ellipsis") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        aria-hidden="true"
                        className="inline-flex min-h-10 min-w-8 items-center justify-center text-xs font-semibold text-muted-foreground"
                      >
                        ...
                      </span>
                    )
                  }
                  const isActive = token === currentPage
                  return (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handlePageChange(token)}
                      aria-label={`Trang ${token}`}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-black/10 bg-card text-foreground shadow-2xs hover:bg-muted dark:border-white/10"
                      )}
                    >
                      {token}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= activeTotalPages}
                  aria-label="Trang sau"
                  className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                >
                  <CaretRight aria-hidden="true" size={16} weight="bold" />
                </button>
              </div>
            </nav>
          )}
        </div>

        {/* Detail Modal */}
        <ResourceDetailModal
          blacklistItem={selectedBlacklistItem}
          whitelistItem={selectedWhitelistItem}
          copiedKey={copiedKey}
          onCopy={handleCopy}
          onClose={() => {
            setSelectedBlacklistItem(null)
            setSelectedWhitelistItem(null)
          }}
        />
      </div>
    </MotionConfig>
  )
}
