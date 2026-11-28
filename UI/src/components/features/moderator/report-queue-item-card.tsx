"use client"

import { Paperclip } from "@phosphor-icons/react"
import {
  reportStatusLabel,
  reportStatusClass,
  reportTargetTypeLabel,
} from "@/features/moderator/report-review"
import type { ModeratorReportItem } from "@/features/moderator/types/moderator.types"
import { formatReportPhoneInput } from "@/features/report/utils/report-phone"
import { cn } from "@/lib/utils"

export function ReportQueueItemCard({
  item,
  isSelected,
  onSelect,
}: {
  item: ModeratorReportItem
  isSelected: boolean
  onSelect: (item: ModeratorReportItem) => void
}) {
  const numericId = item.rawId ?? Number(item.id.split("-").at(-1))

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(item)}
      className={cn(
        "w-full cursor-pointer space-y-2.5 rounded-xl border p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
        isSelected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 dark:border-primary/50 dark:bg-primary/10"
          : "border-black/10 bg-card hover:bg-muted/50 dark:border-white/10"
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono font-semibold text-foreground tabular-nums">
            {numericId}
          </span>
          {item.assignedToMe && (
            <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 font-semibold text-sky-800 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-sky-500 dark:bg-sky-400"
              />
              Phụ trách
            </span>
          )}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
            reportStatusClass[item.status]
          )}
        >
          {reportStatusLabel[item.status] ?? item.status}
        </span>
      </span>

      <span className="block space-y-0.5">
        <span className="block text-xs font-medium text-muted-foreground">
          {reportTargetTypeLabel(item.targetType)}
        </span>
        <span className="block font-mono text-sm font-semibold break-words text-foreground tabular-nums">
          {item.targetType === "PHONE"
            ? formatReportPhoneInput(item.targetIdentifier)
            : item.targetIdentifier}
        </span>
      </span>

      <span className="block text-xs text-muted-foreground">
        {item.category}
      </span>

      {item.whitelisted && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
          />
          Thuộc danh sách tin cậy
        </span>
      )}

      <span className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs text-muted-foreground tabular-nums">
        <span>{item.reportedAt}</span>
        <span className="flex items-center gap-1">
          <Paperclip aria-hidden="true" size={13} />
          {item.evidences?.length ?? 0} bằng chứng
        </span>
      </span>
    </button>
  )
}
