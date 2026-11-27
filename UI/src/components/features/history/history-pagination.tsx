"use client"

import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { buildPaginationRange } from "./history-helpers"

interface HistoryPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize?: number
  periodLabel?: string
  onPageChange: (page: number) => void
}

export function HistoryPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  periodLabel,
  onPageChange,
}: HistoryPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)
  const tokens = buildPaginationRange(currentPage, safeTotalPages)

  return (
    <nav
      aria-label="Phân trang lịch sử kiểm tra"
      className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Hiển thị{" "}
        <span className="font-semibold text-foreground">
          {start}–{end}
        </span>{" "}
        / <span className="font-semibold text-foreground">{totalItems}</span>{" "}
        truy vấn{periodLabel ? ` · ${periodLabel}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
        >
          <CaretLeft aria-hidden="true" size={16} weight="bold" />
        </button>

        {tokens.map((token, index) => {
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
              onClick={() => onPageChange(token)}
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
          onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
          disabled={currentPage >= safeTotalPages}
          aria-label="Trang sau"
          className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-card text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
        >
          <CaretRight aria-hidden="true" size={16} weight="bold" />
        </button>
      </div>
    </nav>
  )
}
