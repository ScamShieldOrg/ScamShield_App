"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface QuotaSnapshot {
  remaining: number
  limit: number
  resetsAt?: string | null
}

function formatResetTime(value: string, includeDate: boolean): string {
  const date = new Date(`${value}+07:00`)
  if (Number.isNaN(date.getTime())) return "00:00 (GMT+7)"
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeDate ? { day: "2-digit", month: "2-digit" } : {}),
  }).format(date)
}

interface ScamQuotaBadgeProps {
  quota: QuotaSnapshot | null
  isLoading?: boolean
  isBusy?: boolean
  error?: string | null
  onRefresh: () => void
}

/**
 * Ultra-compact inline quota indicator tucked cleanly into the Omni-Composer
 * footer so it never competes with the main input surface.
 */
export function ScamQuotaBadge({
  quota,
  isLoading = false,
  isBusy = false,
  error = null,
  onRefresh,
}: ScamQuotaBadgeProps) {
  const exhausted = quota != null && quota.remaining <= 0 && !error
  const lowQuota = quota != null && quota.remaining === 1 && !error

  const dotClass = error
    ? "bg-rose-600 dark:bg-rose-400"
    : exhausted
      ? "bg-amber-600 dark:bg-amber-400"
      : lowQuota
        ? "bg-amber-500 dark:bg-amber-400"
        : quota
          ? "bg-emerald-600 dark:bg-emerald-400"
          : "bg-muted-foreground/50"

  const titleText = quota
    ? `Còn ${quota.remaining}/${quota.limit} lượt hôm nay${
        quota.resetsAt
          ? ` · Đặt lại ${formatResetTime(quota.resetsAt, false)}`
          : ""
      } — Bấm để làm mới`
    : error
      ? "Chưa tải được hạn mức — Bấm để thử lại"
      : "Đang tải hạn mức kiểm tra"

  return (
    <button
      type="button"
      disabled={isBusy || isLoading}
      onClick={onRefresh}
      title={titleText}
      aria-label={titleText}
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-[color,background-color] duration-120 hover:bg-muted/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", dotClass)}
      />
      <span className="whitespace-nowrap tabular-nums">
        {quota ? (
          <>
            <strong
              className={cn(
                "font-semibold",
                exhausted
                  ? "text-rose-700 dark:text-rose-400"
                  : lowQuota
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-foreground"
              )}
            >
              {quota.remaining}/{quota.limit}
            </strong>{" "}
            <span className="hidden sm:inline">lượt</span>
          </>
        ) : isLoading ? (
          "…"
        ) : (
          "Hạn mức"
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex",
          (isBusy || isLoading) && "motion-safe:animate-spin"
        )}
      >
        <ArrowClockwise size={12} weight="bold" />
      </span>
    </button>
  )
}

interface ScamQuotaStripProps {
  mode: "guest" | "user"
  quota: QuotaSnapshot | null
  error?: string | null
}

/**
 * Surfaces an actionable quota-exhausted notice ONLY when remaining === 0.
 * Zero visual clutter during normal usage.
 */
export function ScamQuotaStrip({
  mode,
  quota,
  error = null,
}: ScamQuotaStripProps) {
  const exhausted = quota != null && quota.remaining <= 0 && !error

  return (
    <AnimatePresence initial={false}>
      {exhausted && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <WarningCircle
              aria-hidden="true"
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400"
            />
            <div className="space-y-1">
              <p className="font-semibold">
                {mode === "guest"
                  ? "Bạn đã dùng hết lượt kiểm tra miễn phí trong ngày"
                  : "Bạn đã dùng hết hạn mức kiểm tra hôm nay"}
              </p>
              <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                {mode === "guest"
                  ? "Đăng nhập hoặc tạo tài khoản miễn phí để nhận thêm lượt kiểm tra và lưu lịch sử tra cứu."
                  : `Hạn mức sẽ tự động đặt lại lúc ${
                      quota?.resetsAt
                        ? formatResetTime(quota.resetsAt, false)
                        : "00:00"
                    } (giờ Việt Nam).`}
              </p>
            </div>
          </div>

          {mode === "guest" && (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-md border border-amber-700/25 bg-background px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity duration-120 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Tạo tài khoản
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
