"use client"

import type { KeyboardEvent } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type {
  HistoryRiskStatus,
  ScamCheckRiskCounts,
} from "@/features/history/types/history.types"
import { getHistoryRiskMeta } from "./history-helpers"

interface HistoryRiskPillsProps {
  currentStatus: "ALL" | HistoryRiskStatus
  onSelectStatus: (status: "ALL" | HistoryRiskStatus) => void
  counts?: ScamCheckRiskCounts | null
}

const STATUS_ORDER: ("ALL" | HistoryRiskStatus)[] = [
  "ALL",
  "DANGEROUS",
  "SUSPICIOUS",
  "SAFE",
  "UNKNOWN",
]

export function HistoryRiskPills({
  currentStatus,
  onSelectStatus,
  counts,
}: HistoryRiskPillsProps) {
  const pills = STATUS_ORDER.map((status) => {
    if (status === "ALL") {
      return {
        status,
        label: "Tất cả",
        count: counts?.all ?? 0,
        dotClass: "bg-foreground/70",
      }
    }
    const meta = getHistoryRiskMeta(status)
    const countMap: Record<HistoryRiskStatus, number> = {
      DANGEROUS: counts?.dangerous ?? 0,
      SUSPICIOUS: counts?.suspicious ?? 0,
      SAFE: counts?.safe ?? 0,
      UNKNOWN: counts?.unknown ?? 0,
    }
    return {
      status,
      label: meta.pillLabel,
      count: countMap[status],
      dotClass: meta.dotClass,
    }
  })

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const direction = event.key === "ArrowRight" ? 1 : -1
    const nextIndex = (index + direction + pills.length) % pills.length
    onSelectStatus(pills[nextIndex].status)
    const container = event.currentTarget.parentElement
    const nextButton = container?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]'
    )[nextIndex]
    nextButton?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Lọc lịch sử theo mức độ rủi ro"
      className="flex flex-wrap items-center gap-2"
    >
      {pills.map((pill, index) => {
        const isActive = currentStatus === pill.status
        return (
          <button
            key={pill.status}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectStatus(pill.status)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "border-primary/25 text-primary-foreground dark:border-white/15"
                : "border-black/10 bg-card text-foreground/85 hover:bg-muted/60 hover:text-foreground dark:border-white/10"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="history-risk-active-pill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-primary shadow-xs"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  isActive ? "bg-primary-foreground" : pill.dotClass
                )}
              />
              <span>{pill.label}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  isActive
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {pill.count}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
