import {
  FileText,
  ShieldCheck,
  TrendUp,
  Medal,
  Shield,
} from "@phosphor-icons/react"
import { ReportSummaryMetrics } from "@/features/report/types/report.types"

interface ReportMetricsCardsProps {
  metrics?: ReportSummaryMetrics
  isLoading?: boolean
}

export function ReportMetricsCards({
  metrics,
  isLoading = false,
}: ReportMetricsCardsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-3 rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded-md bg-slate-200 dark:bg-slate-700" />
              <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-36 rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Tổng báo cáo */}
      <div className="space-y-3 rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
            Tổng báo cáo đã gửi
          </span>
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#FAF8FF] text-[#008CC7] dark:bg-muted dark:text-primary">
            <FileText size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-extrabold text-[#131B2E] dark:text-foreground">
          {metrics.totalReports}
        </div>

        <div className="inline-flex min-h-6 items-center gap-1 rounded-full bg-[#E2E7FF]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#131B2E] dark:bg-muted dark:text-foreground">
          <span className="font-bold text-[#008CC7] dark:text-primary">
            +{metrics.recentReports7Days}
          </span>{" "}
          báo cáo được gửi trong 7 ngày qua
        </div>
      </div>

      {/* Card 2: Đã duyệt vào Blacklist */}
      <div className="space-y-3 rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
            Đã duyệt vào Blacklist
          </span>
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-[#00875A] dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-extrabold text-[#00875A] dark:text-emerald-400">
          {metrics.blacklistedCount}
        </div>

        <div className="flex min-h-6 items-center gap-1.5 text-[11px] font-medium text-[#45464D] dark:text-muted-foreground">
          <Shield
            size={13}
            weight="fill"
            className="text-[#00875A] dark:text-emerald-400"
          />
          <span>
            Bảo vệ ước tính ~{metrics.queriesProtected.toLocaleString()} lượt
            truy vấn
          </span>
        </div>
      </div>

      {/* Card 3: Tỷ lệ chính xác */}
      <div className="space-y-3 rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
            Tỷ lệ chính xác
          </span>
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
            <TrendUp size={18} weight="bold" />
          </div>
        </div>

        <div className="font-heading text-3xl font-extrabold text-[#131B2E] dark:text-foreground">
          {metrics.accuracyRate}%
        </div>

        <div className="flex min-h-6 items-center gap-2 text-[11px]">
          <span className="text-[#45464D] dark:text-muted-foreground">
            Độ tin cậy xếp hạng:
          </span>
          <span className="rounded-md bg-[#0B132B] px-2 py-0.5 font-heading text-[10px] font-bold text-white dark:bg-primary dark:text-primary-foreground">
            {metrics.rankTitle}
          </span>
        </div>
      </div>

      {/* Card 4: Điểm uy tín tích lũy */}
      <div className="space-y-3 rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
            Điểm uy tín tích lũy
          </span>
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#0B132B] text-white dark:bg-primary dark:text-primary-foreground">
            <Medal size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-extrabold text-[#131B2E] dark:text-foreground">
          {metrics.reputationPoints.toLocaleString("vi-VN")}
        </div>
      </div>
    </div>
  )
}
