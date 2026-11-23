"use client"

import Link from "next/link"
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface QuotaSnapshot {
  remaining: number
  limit: number
  resetsAt?: string | null
}

interface ScamQuotaStripProps {
  mode: "guest" | "user"
  quota: QuotaSnapshot | null
  isLoading?: boolean
  isBusy?: boolean
  error?: string | null
  onRefresh: () => void
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

export function ScamQuotaStrip({
  mode,
  quota,
  isLoading = false,
  isBusy = false,
  error = null,
  onRefresh,
}: ScamQuotaStripProps) {
  const exhausted = quota != null && quota.remaining <= 0 && !error
  const lowQuota = quota != null && quota.remaining === 1 && !error

  const statusDotClass = error
    ? "bg-rose-600 dark:bg-rose-400"
    : exhausted
      ? "bg-amber-600 dark:bg-amber-400"
      : lowQuota
        ? "bg-amber-500 dark:bg-amber-400"
        : quota
          ? "bg-emerald-600 dark:bg-emerald-400"
          : "bg-muted-foreground/50"

  return (
    <div className="space-y-3">
      {/* Compact single-line status strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-card/80 px-4 py-2 text-xs text-muted-foreground dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", statusDotClass)}
          />
          {quota ? (
            <span className="text-foreground">
              {mode === "guest"
                ? "Lượt kiểm tra miễn phí hôm nay:"
                : "Lượt kiểm tra còn lại hôm nay:"}{" "}
              <strong
                className={cn(
                  "font-semibold tabular-nums",
                  exhausted
                    ? "text-rose-700 dark:text-rose-400"
                    : lowQuota
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {quota.remaining}/{quota.limit}
              </strong>
              {quota.resetsAt && (
                <span className="ml-2 text-muted-foreground tabular-nums">
                  · Đặt lại {formatResetTime(quota.resetsAt, mode === "guest")}
                </span>
              )}
            </span>
          ) : (
            <span role="status">
              {isLoading
                ? "Đang tải hạn mức kiểm tra…"
                : "Chưa có thông tin hạn mức"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {mode === "guest" && lowQuota && (
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 transition-colors duration-120 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Đăng nhập để thêm lượt
            </Link>
          )}
          <button
            type="button"
            disabled={isBusy || isLoading}
            onClick={onRefresh}
            aria-label="Cập nhật hạn mức kiểm tra"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-[color,background-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowClockwise
              aria-hidden="true"
              size={14}
              weight="bold"
              className={
                isBusy || isLoading ? "motion-safe:animate-spin" : undefined
              }
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Expandable actionable callout ONLY when quota is exhausted */}
      {exhausted && (
        <div
          role="alert"
          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100"
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
                  ? "Đăng nhập hoặc tạo tài khoản miễn phí để tiếp tục kiểm tra với hạn mức cao hơn và lưu lịch sử tra cứu."
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
                className="inline-flex h-8 items-center rounded-md border border-amber-700/25 bg-background px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity duration-120 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Tạo tài khoản
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
