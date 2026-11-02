"use client"

import { Lock, Paperclip } from "@phosphor-icons/react"
import { ModeratorReportItem } from "@/features/moderator/types/moderator.types"

interface ReportQueueItemCardProps {
  item: ModeratorReportItem
  isSelected: boolean
  onSelect: (item: ModeratorReportItem) => void
}

export function ReportQueueItemCard({ item, isSelected, onSelect }: ReportQueueItemCardProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60"
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
      case "In Review":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
      case "Locked":
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
        isSelected
          ? "border-rose-500 bg-rose-50/20 shadow-xs ring-1 ring-rose-500/30 dark:border-rose-500/80 dark:bg-rose-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      {/* Top Header Row: ID + Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {item.isLocked && <Lock size={13} className="text-slate-400" weight="bold" />}
          <span>{item.id}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(
              item.priority
            )}`}
          >
            {item.priority}
          </span>
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(
              item.status
            )}`}
          >
            {item.status}
          </span>
        </div>
      </div>

      {/* Target Identifier */}
      <div className="mt-2 text-sm font-bold tracking-tight text-slate-900 group-hover:text-rose-600 dark:text-white dark:group-hover:text-rose-400">
        {item.targetIdentifier}
      </div>

      {/* Category */}
      <div className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {item.category}
      </div>

      {/* Footer Meta Row */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {item.reportCount} báo cáo
          </span>
          <span>{item.reportedAt}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-bold text-slate-900 dark:text-white">
            AI:{" "}
            <span
              className={
                item.aiScore != null && item.aiScore >= 80
                  ? "text-rose-600 dark:text-rose-400"
                  : item.aiScore != null
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400"
              }
            >
              {item.aiScore != null ? item.aiScore : "--"}
            </span>
          </span>
          <span className="flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
            <Paperclip size={12} weight="bold" />
            <span>{item.evidenceCompleteness ?? 0}%</span>
          </span>
        </div>
      </div>
    </div>
  )
}
