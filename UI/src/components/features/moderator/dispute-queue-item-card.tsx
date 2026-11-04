"use client"

import { ArrowLeft, Paperclip } from "@phosphor-icons/react"
import { ModeratorDisputeItem } from "@/features/moderator/types/moderator-dispute.types"

interface DisputeQueueItemCardProps {
  item: ModeratorDisputeItem
  isSelected: boolean
  onSelect: (item: ModeratorDisputeItem) => void
}

export function DisputeQueueItemCard({
  item,
  isSelected,
  onSelect,
}: DisputeQueueItemCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đang xét":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
      case "Chấp nhận":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900"
      case "Từ chối":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const getOriginalDecisionBadge = (decision: string) => {
    switch (decision) {
      case "Approved":
        return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
      case "Rejected":
        return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
      default:
        return "border-slate-200 bg-slate-50 text-slate-700"
    }
  }

  const count = item.evidenceCount ?? item.evidences?.length ?? 0

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
        isSelected
          ? "border-amber-500 bg-amber-50/20 shadow-xs ring-1 ring-amber-500/30 dark:border-amber-500/80 dark:bg-amber-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}
    >
      {/* Top Header Row: ID + Original Report ID + Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{item.id}</span>
          {item.originalReportId && (
            <>
              <ArrowLeft size={11} className="text-slate-400" />
              <span className="text-[11px] text-slate-400">{item.originalReportId}</span>
            </>
          )}
        </div>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(
            item.status
          )}`}
        >
          {item.status}
        </span>
      </div>

      {/* Target Identifier */}
      <div className="mt-2 text-sm font-bold tracking-tight text-slate-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
        {item.targetIdentifier}
      </div>

      {/* Category */}
      <div className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {item.category}
      </div>

      {/* Footer Row: Original Decision & Date & Evidence Count */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-medium dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getOriginalDecisionBadge(
              item.originalDecision
            )}`}
          >
            Gốc: {item.originalDecision}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{item.disputedAt}</span>
        </div>

        {count > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Paperclip size={12} weight="bold" />
            <span>{count} tài liệu</span>
          </span>
        )}
      </div>
    </div>
  )
}
