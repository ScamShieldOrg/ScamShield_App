"use client"

import { XCircle, Warning, ShieldCheck, Question } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { HistoryRiskStatus, ScamCheckRiskCounts } from "@/features/history/types/history.types"

interface HistoryRiskPillsProps {
  currentStatus: "ALL" | HistoryRiskStatus
  onSelectStatus: (status: "ALL" | HistoryRiskStatus) => void
  counts?: ScamCheckRiskCounts | null
}

export function HistoryRiskPills({
  currentStatus,
  onSelectStatus,
  counts,
}: HistoryRiskPillsProps) {
  const pills: {
    status: "ALL" | HistoryRiskStatus
    label: string
    count: number
    icon?: typeof XCircle
    colorClass: string
    activeClass: string
  }[] = [
    {
      status: "ALL",
      label: "Tất cả",
      count: counts?.all ?? 0,
      colorClass: "text-[#131B2E] border-[#C6C6CE]/50 dark:text-foreground",
      activeClass:
        "bg-[#0B132B] text-white border-[#0B132B] dark:bg-primary dark:text-primary-foreground",
    },
    {
      status: "DANGEROUS",
      label: "Lừa đảo nguy cơ cao",
      count: counts?.dangerous ?? 0,
      icon: XCircle,
      colorClass:
        "text-[#BA1A1A] border-rose-200 dark:text-rose-400 dark:border-rose-900/40",
      activeClass:
        "bg-rose-100 text-[#BA1A1A] border-[#BA1A1A] font-bold dark:bg-rose-950/60 dark:text-rose-300",
    },
    {
      status: "SUSPICIOUS",
      label: "Nghi vấn rủi ro",
      count: counts?.suspicious ?? 0,
      icon: Warning,
      colorClass:
        "text-[#B45309] border-amber-200 dark:text-amber-400 dark:border-amber-900/40",
      activeClass:
        "bg-amber-100 text-[#B45309] border-[#B45309] font-bold dark:bg-amber-950/60 dark:text-amber-300",
    },
    {
      status: "SAFE",
      label: "An toàn chính hãng",
      count: counts?.safe ?? 0,
      icon: ShieldCheck,
      colorClass:
        "text-[#00875A] border-emerald-200 dark:text-emerald-400 dark:border-emerald-900/40",
      activeClass:
        "bg-emerald-100 text-[#00875A] border-[#00875A] font-bold dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    {
      status: "UNKNOWN",
      label: "Chưa xác định - Unknown",
      count: counts?.unknown ?? 0,
      icon: Question,
      colorClass:
        "text-[#475569] border-slate-200 dark:text-slate-400 dark:border-slate-800",
      activeClass:
        "bg-slate-100 text-[#475569] border-[#475569] font-bold dark:bg-slate-900 dark:text-slate-300",
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => {
        const Icon = pill.icon
        const isActive = currentStatus === pill.status
        return (
          <button
            key={pill.status}
            type="button"
            onClick={() => onSelectStatus(pill.status)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all",
              isActive
                ? pill.activeClass
                : `bg-white hover:bg-[#FAF8FF] dark:bg-card ${pill.colorClass}`
            )}
          >
            {Icon && <Icon size={14} weight="fill" />}
            <span>
              {pill.label} ({pill.count})
            </span>
          </button>
        )
      })}
    </div>
  )
}
