"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CaretRight,
  ClockCounterClockwise,
  ShieldCheck,
  ShieldWarning,
  SidebarSimple,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { getScamCheckHistory } from "@/features/history/services/history.service"
import type {
  HistoryItem,
  HistoryRiskStatus,
  ScamCheckRiskCounts,
} from "@/features/history/types/history.types"
import {
  SCAM_CHECK_THEMES,
  type ScamCheckThemeConfig,
} from "./scam-check-theme"

const RISK_META: Record<
  HistoryRiskStatus,
  { label: string; dot: string; badge: string }
> = {
  DANGEROUS: {
    label: "Nguy hiểm",
    dot: "bg-rose-600 dark:bg-rose-400",
    badge:
      "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300",
  },
  SUSPICIOUS: {
    label: "Nghi vấn",
    dot: "bg-amber-500 dark:bg-amber-400",
    badge:
      "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  },
  SAFE: {
    label: "An toàn",
    dot: "bg-emerald-600 dark:bg-emerald-400",
    badge:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
  UNKNOWN: {
    label: "Chưa rõ",
    dot: "bg-slate-400 dark:bg-slate-400",
    badge:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
}

interface UserRecentChecksSidebarProps {
  open: boolean
  onToggle: () => void
  /** Increment when a new scan completes so the list stays fresh. */
  refreshSignal?: number
  theme?: ScamCheckThemeConfig
}

export function UserRecentChecksSidebar({
  open,
  onToggle,
  refreshSignal = 0,
  theme = SCAM_CHECK_THEMES["shield-emerald"],
}: UserRecentChecksSidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [counts, setCounts] = useState<ScamCheckRiskCounts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const fetchKey = `${refreshSignal}:${retryCount}`
  const [settledKey, setSettledKey] = useState("")

  useEffect(() => {
    let active = true
    getScamCheckHistory({ page: 0, size: 8 })
      .then((res) => {
        if (!active) return
        setItems(res.items?.data?.slice(0, 8) ?? [])
        setCounts(res.riskCounts ?? null)
        setError(null)
        setSettledKey(fetchKey)
      })
      .catch(() => {
        if (!active) return
        setError("Không thể tải lịch sử kiểm tra.")
        setSettledKey(fetchKey)
      })
    return () => {
      active = false
    }
  }, [fetchKey])

  const isLoading = settledKey !== fetchKey && items.length === 0
  const handleRetry = () => {
    setError(null)
    setRetryCount((prev) => prev + 1)
  }
  const threatCount = counts
    ? (counts.dangerous ?? 0) + (counts.suspicious ?? 0)
    : 0

  if (!open) return null

  return (
    <aside
      aria-label="Lịch sử kiểm tra gần đây"
      className="relative z-10 hidden w-[312px] shrink-0 flex-col bg-transparent pl-2.5 transition-colors duration-200 xl:flex"
    >
      {/* Sidebar Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-2.5 pt-1 pb-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise
            aria-hidden="true"
            size={16}
            weight="bold"
            className={theme.heroPillIcon}
          />
          <h2 className="text-sm font-semibold text-foreground">
            Kiểm tra gần đây
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggle}
          title="Thu gọn bảng lịch sử"
          aria-label="Thu gọn bảng lịch sử"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <SidebarSimple aria-hidden="true" size={17} weight="bold" />
        </button>
      </div>

      {/* Protection Summary Card (Real riskCounts) */}
      <div className="relative z-10 px-2 pb-3">
        <div
          className={cn(
            "grid grid-cols-2 gap-2.5 rounded-xl border p-3 transition-colors duration-200",
            theme.sidebarHighlight
          )}
        >
          <div className="space-y-0.5">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck
                aria-hidden="true"
                size={13}
                weight="fill"
                className={theme.heroPillIcon}
              />
              <span>Đã kiểm tra</span>
            </p>
            <p className="font-heading text-xl font-bold text-foreground tabular-nums">
              {counts ? counts.all : "—"}
            </p>
          </div>

          <div className="space-y-0.5 border-l border-border/70 pl-2.5 dark:border-white/10">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ShieldWarning
                aria-hidden="true"
                size={13}
                weight="fill"
                className="text-rose-600 dark:text-rose-400"
              />
              <span>Mối nguy</span>
            </p>
            <p className="font-heading text-xl font-bold text-rose-700 tabular-nums dark:text-rose-400">
              {counts ? threatCount : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Recent List */}
      <div className="relative z-10 flex-1 space-y-2 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-[64px] animate-pulse rounded-xl border border-border/70 bg-muted/40 dark:border-white/10"
              />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-5 text-center"
          >
            <p className="text-xs font-medium text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 px-3.5 py-6 text-center dark:border-white/12">
            <p className="text-xs font-medium text-foreground">
              Chưa có lượt kiểm tra nào
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Các nội dung bạn kiểm tra sẽ xuất hiện ngay tại đây để tra cứu
              nhanh.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="shrink-0 cursor-pointer font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  Thử lại
                </button>
              </div>
            )}
            {items.map((item) => {
            const risk = RISK_META[item.verdictStatus] ?? RISK_META.UNKNOWN
            const displayText =
              item.targetValue?.trim() ||
              item.snippet?.trim() ||
              "Bản ghi kiểm tra"

            return (
              <Link
                key={item.id}
                href={`/user/history/${encodeURIComponent(item.id)}?from=check`}
                className="group block rounded-xl border border-border/80 bg-card/85 p-3 shadow-2xs transition-[border-color,background-color,box-shadow] duration-150 hover:border-foreground/20 hover:bg-card hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 flex-1 text-xs font-semibold text-foreground">
                    {displayText}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                      risk.badge
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 rounded-full", risk.dot)}
                    />
                    <span>{risk.label}</span>
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{item.category}</span>
                  {item.timestamp && (
                    <span className="shrink-0 tabular-nums">
                      {item.timestamp}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="relative z-10 px-2 pt-2">
        <Link
          href="/user/history"
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground shadow-2xs transition-[border-color,background-color] duration-150 hover:border-foreground/20 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
        >
          <span>Xem toàn bộ lịch sử</span>
          <CaretRight aria-hidden="true" size={13} weight="bold" />
        </Link>
      </div>
    </aside>
  )
}
