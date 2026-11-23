"use client"

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react"

interface ScamErrorCalloutProps {
  title?: string
  message: string
  preserveDraftHint?: boolean
  onRetry?: () => void
  onRefreshQuota?: () => void
  isBusy?: boolean
}

export function ScamErrorCallout({
  title = "Chưa thể hoàn tất kiểm tra",
  message,
  preserveDraftHint = true,
  onRetry,
  onRefreshQuota,
  isBusy = false,
}: ScamErrorCalloutProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-rose-500/25 bg-rose-500/10 p-4 text-rose-950 transition-[opacity,transform] duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] sm:flex-row sm:items-start sm:justify-between dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-100"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <WarningCircle
          aria-hidden="true"
          size={20}
          weight="fill"
          className="mt-0.5 shrink-0 text-rose-700 dark:text-rose-400"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm leading-relaxed text-rose-900/90 dark:text-rose-200/90">
            {message}
          </p>
          {preserveDraftHint && (
            <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
              Nội dung bạn đã nhập vẫn được giữ nguyên.
            </p>
          )}
        </div>
      </div>

      {(onRetry || onRefreshQuota) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5">
          {onRetry && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onRetry}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-rose-700 px-3 text-xs font-semibold text-white transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-rose-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              <ArrowClockwise aria-hidden="true" size={14} weight="bold" />
              <span>Thử lại</span>
            </button>
          )}
          {onRefreshQuota && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onRefreshQuota}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-rose-700/25 bg-background px-3 text-xs font-semibold text-foreground transition-colors duration-120 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/25"
            >
              <span>Cập nhật hạn mức</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
