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

const cardSurfaceClass =
  "flex flex-col justify-between space-y-3 rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"

export function ReportMetricsCards({
  metrics,
  isLoading = false,
}: ReportMetricsCardsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${cardSurfaceClass} motion-safe:animate-pulse`}>
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded-md bg-muted" />
              <div className="size-9 rounded-lg bg-muted/80" />
            </div>
            <div className="h-8 w-20 rounded-md bg-muted" />
            <div className="h-5 w-36 rounded-md bg-muted/70" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Tổng báo cáo */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Tổng báo cáo đã gửi
          </span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300">
            <FileText aria-hidden="true" size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-bold tracking-[-0.025em] text-foreground tabular-nums">
          {metrics.totalReports.toLocaleString("vi-VN")}
        </div>

        <div className="inline-flex w-fit items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-200">
          <span className="font-semibold tabular-nums">
            +{metrics.recentReports7Days.toLocaleString("vi-VN")}
          </span>
          <span>trong 7 ngày qua</span>
        </div>
      </div>

      {/* Card 2: Đã duyệt vào Blacklist */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Đã duyệt vào Blacklist
          </span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300">
            <ShieldCheck aria-hidden="true" size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-bold tracking-[-0.025em] text-emerald-700 tabular-nums dark:text-emerald-400">
          {metrics.blacklistedCount.toLocaleString("vi-VN")}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Shield
            aria-hidden="true"
            size={14}
            weight="fill"
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span className="tabular-nums">
            Bảo vệ ~{metrics.queriesProtected.toLocaleString("vi-VN")} lượt tra
            cứu
          </span>
        </div>
      </div>

      {/* Card 3: Tỷ lệ chính xác */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Tỷ lệ chính xác
          </span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
            <TrendUp aria-hidden="true" size={18} weight="bold" />
          </div>
        </div>

        <div className="font-heading text-3xl font-bold tracking-[-0.025em] text-foreground tabular-nums">
          {metrics.accuracyRate}%
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Hạng tin cậy:</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
            />
            {metrics.rankTitle}
          </span>
        </div>
      </div>

      {/* Card 4: Điểm uy tín tích lũy */}
      <div className={cardSurfaceClass}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Điểm uy tín tích lũy
          </span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-300">
            <Medal aria-hidden="true" size={18} weight="fill" />
          </div>
        </div>

        <div className="font-heading text-3xl font-bold tracking-[-0.025em] text-foreground tabular-nums">
          {metrics.reputationPoints.toLocaleString("vi-VN")}
        </div>

        <p className="text-xs text-muted-foreground">
          Cộng dồn từ báo cáo được xác minh
        </p>
      </div>
    </div>
  )
}
