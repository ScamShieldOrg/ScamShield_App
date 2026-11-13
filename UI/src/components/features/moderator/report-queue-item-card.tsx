"use client"
import { Paperclip } from "@phosphor-icons/react"
import {
  reportStatusLabel,
  reportStatusClass,
  reportTargetTypeLabel,
} from "@/features/moderator/report-review"
import type { ModeratorReportItem } from "@/features/moderator/types/moderator.types"
export function ReportQueueItemCard({
  item,
  isSelected,
  onSelect,
}: {
  item: ModeratorReportItem
  isSelected: boolean
  onSelect: (item: ModeratorReportItem) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(item)}
      className={`w-full space-y-2 rounded-xl border p-4 text-left disabled:opacity-60 ${isSelected ? "border-primary bg-muted ring-1 ring-primary" : "border-border bg-card hover:bg-muted"}`}
    >
      <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
            Mã báo cáo
            <span className="font-semibold text-foreground tabular-nums">
              {item.rawId ?? Number(item.id.split("-").at(-1))}
            </span>
          </span>
          {item.assignedToMe && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              Phụ trách
            </span>
          )}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${reportStatusClass[item.status]}`}
        >
          {reportStatusLabel[item.status] ?? item.status}
        </span>
      </span>
      <span className="block text-xs text-muted-foreground">
        Đối tượng bị báo cáo
      </span>
      <span className="block text-xs font-medium text-muted-foreground">
        {reportTargetTypeLabel(item.targetType)}
      </span>
      <span className="block text-sm font-semibold break-all">
        {item.targetIdentifier}
      </span>
      <span className="block text-xs text-muted-foreground">
        {item.category}
      </span>
      {item.whitelisted && (
        <span className="block text-xs font-medium text-amber-800 dark:text-amber-300">
          Đối tượng thuộc danh sách tin cậy
        </span>
      )}
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{item.reportedAt}</span>
        <span className="flex items-center gap-1">
          <Paperclip size={13} />
          {item.evidences?.length ?? 0} bằng chứng
        </span>
      </span>
    </button>
  )
}
