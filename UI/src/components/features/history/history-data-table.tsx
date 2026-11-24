"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowCounterClockwise,
  ArrowRight,
  ArrowsClockwise,
  Bank,
  Car,
  ChatDots,
  CircleNotch,
  ClockCounterClockwise,
  CurrencyBtc,
  FileText,
  Link as LinkIcon,
  PhoneCall,
  ShieldCheck,
  ShieldPlus,
  Trash,
} from "@phosphor-icons/react"
import type { HistoryItem } from "@/features/history/types/history.types"
import { cn } from "@/lib/utils"
import {
  getHistoryRiskMeta,
  getHistoryTargetMeta,
  isIdentifierTargetType,
  shouldShowHistorySnippet,
  type HistoryTargetMeta,
} from "./history-helpers"

interface HistoryDataTableProps {
  items: HistoryItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onDeleteSelected: () => void
  isLoading?: boolean
  isDeleting?: boolean
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

function TargetIcon({ iconKey }: { iconKey: HistoryTargetMeta["iconKey"] }) {
  const props = { size: 18, weight: "duotone" as const, "aria-hidden": true }
  switch (iconKey) {
    case "phone":
      return <PhoneCall {...props} />
    case "url":
      return <LinkIcon {...props} />
    case "sms":
      return <ShieldCheck {...props} />
    case "chat":
      return <ChatDots {...props} />
    case "bank":
      return <Bank {...props} />
    case "traffic":
      return <Car {...props} />
    case "crypto":
      return <CurrencyBtc {...props} />
    case "message":
    default:
      return <FileText {...props} />
  }
}

function RiskVerdictCell({ item }: { item: HistoryItem }) {
  const meta = getHistoryRiskMeta(item.verdictStatus)
  const scoreStr =
    item.riskScore != null ? String(Math.round(item.riskScore)).padStart(2, "0") : null

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
          meta.badgeClass
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)}
        />
        <span>{item.verdictLabel || meta.label}</span>
      </span>
      {scoreStr != null && (
        <span
          className={cn(
            "font-mono text-xs font-semibold tabular-nums",
            meta.scoreClass
          )}
        >
          Điểm rủi ro: {scoreStr}/100
        </span>
      )}
    </div>
  )
}

export function HistoryDataTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDeleteSelected,
  isLoading = false,
  isDeleting = false,
  hasActiveFilters = false,
  onResetFilters,
}: HistoryDataTableProps) {
  const selectedOnThisPageCount = items.filter((item) =>
    selectedIds.includes(item.id)
  ).length
  const isAllSelected =
    items.length > 0 && selectedOnThisPageCount === items.length

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-card shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
      {/* Selection Toolbar */}
      <div className="flex min-h-13 flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-2.5 sm:px-5">
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2.5 text-xs font-semibold text-foreground select-none">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            disabled={items.length === 0 || isLoading}
            className="size-4 cursor-pointer rounded-md border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="tabular-nums">
            Chọn trang này ({selectedOnThisPageCount}/{items.length})
          </span>
        </label>

        <AnimatePresence initial={false}>
          {selectedOnThisPageCount > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={onDeleteSelected}
              disabled={isDeleting}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-semibold text-rose-800 transition-colors duration-120 hover:bg-rose-500/20 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25"
            >
              {isDeleting ? (
                <div className="motion-safe:animate-spin">
                  <CircleNotch aria-hidden="true" size={14} weight="bold" />
                </div>
              ) : (
                <Trash aria-hidden="true" size={14} weight="bold" />
              )}
              <span className="tabular-nums">
                {isDeleting
                  ? "Đang xóa..."
                  : `Xóa mục đã chọn (${selectedOnThisPageCount})`}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Data Region */}
      <div className="relative">
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-[2px]"
          >
            <div className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm dark:border-white/10">
              <div className="motion-safe:animate-spin">
                <CircleNotch
                  aria-hidden="true"
                  size={18}
                  weight="bold"
                  className="text-primary"
                />
              </div>
              <span>Đang tải lịch sử...</span>
            </div>
          </div>
        )}

        {items.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border border-black/10 bg-muted/40 text-muted-foreground dark:border-white/10">
              <ClockCounterClockwise aria-hidden="true" size={24} weight="duotone" />
            </div>
            <h2 className="mt-4 font-heading text-base font-bold tracking-[-0.02em] text-foreground">
              {hasActiveFilters
                ? "Không tìm thấy kết quả phù hợp"
                : "Chưa có lịch sử kiểm tra nào"}
            </h2>
            <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              {hasActiveFilters
                ? "Thử đổi từ khóa tìm kiếm, mở rộng khoảng thời gian hoặc đặt lại bộ lọc."
                : "Mọi số điện thoại, đường dẫn hoặc tin nhắn bạn kiểm tra sẽ được lưu tại đây để dễ đối chiếu lại."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {hasActiveFilters && onResetFilters ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
                >
                  <ArrowCounterClockwise aria-hidden="true" size={16} weight="bold" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              ) : (
                <Link
                  href="/user/check"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ShieldPlus aria-hidden="true" size={16} weight="bold" />
                  <span>Kiểm tra lừa đảo ngay</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md): Zero horizontal overflow */}
            <ul className="divide-y divide-border/70 md:hidden">
              {items.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                const targetMeta = getHistoryTargetMeta(item.targetType)
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "space-y-3 p-4 transition-colors",
                      isSelected && "bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(item.id)}
                          aria-label={`Chọn bản ghi ${item.targetValue}`}
                          className="mt-1 size-4 shrink-0 cursor-pointer rounded-md border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        />
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                            targetMeta.surfaceClass
                          )}
                          title={targetMeta.label}
                        >
                          <TargetIcon iconKey={targetMeta.iconKey} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p
                            className={cn(
                              "line-clamp-2 text-sm font-semibold text-foreground",
                              isIdentifierTargetType(item.targetType)
                                ? "font-mono break-all"
                                : "leading-relaxed break-words"
                            )}
                          >
                            {item.targetValue}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {item.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>

                    {shouldShowHistorySnippet(item.targetValue, item.snippet) && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.snippet}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                        {item.category}
                      </span>
                      {item.isRetroactive && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                          <ArrowsClockwise aria-hidden="true" size={12} weight="bold" />
                          <span>Cập nhật hồi tố</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <RiskVerdictCell item={item} />
                      <Link
                        href={`/user/history/${item.id}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-black/10 bg-background px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
                      >
                        <span>Xem chi tiết</span>
                        <ArrowRight aria-hidden="true" size={14} weight="bold" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop Table (md+) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold text-muted-foreground">
                    <th className="w-12 px-4 py-3.5 text-center">
                      <span className="sr-only">Chọn</span>
                    </th>
                    <th className="w-48 px-4 py-3.5">Thời gian</th>
                    <th className="px-4 py-3.5">Mục tiêu & Nội dung tra cứu</th>
                    <th className="w-44 px-4 py-3.5">Phân loại</th>
                    <th className="w-52 px-4 py-3.5">Kết luận</th>
                    <th className="w-32 px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const targetMeta = getHistoryTargetMeta(item.targetType)
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isSelected && "bg-muted/40"
                        )}
                      >
                        <td className="px-4 py-4 text-center align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(item.id)}
                            aria-label={`Chọn bản ghi ${item.targetValue}`}
                            className="mt-1 size-4 cursor-pointer rounded-md border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          />
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1.5">
                            <p className="text-sm font-medium text-foreground tabular-nums">
                              {item.timestamp}
                            </p>
                            {item.ip && (
                              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                                IP: {item.ip}
                              </p>
                            )}
                            {item.isRetroactive && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                                <ArrowsClockwise
                                  aria-hidden="true"
                                  size={12}
                                  weight="bold"
                                />
                                <span>Cập nhật hồi tố</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
                                targetMeta.surfaceClass
                              )}
                              title={targetMeta.label}
                            >
                              <TargetIcon iconKey={targetMeta.iconKey} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p
                                className={cn(
                                  "line-clamp-2 max-w-[60ch] text-sm font-semibold text-foreground",
                                  isIdentifierTargetType(item.targetType)
                                    ? "font-mono break-all"
                                    : "leading-relaxed break-words"
                                )}
                              >
                                {item.targetValue}
                              </p>
                              {shouldShowHistorySnippet(
                                item.targetValue,
                                item.snippet
                              ) && (
                                <p className="line-clamp-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                                  {item.snippet}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <RiskVerdictCell item={item} />
                        </td>

                        <td className="px-4 py-4 text-right align-top">
                          <Link
                            href={`/user/history/${item.id}`}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-background px-3 text-xs font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
                          >
                            <span>Chi tiết</span>
                            <ArrowRight aria-hidden="true" size={13} weight="bold" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
