"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { MotionConfig } from "motion/react"
import { CircleNotch, DownloadSimple, Plus } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { ReportMetricsCards } from "@/components/features/report/report-metrics-cards"
import { ReportTrackingTable } from "@/components/features/report/report-tracking-table"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
import { ExpandableIconButton } from "@/components/shared/expandable-icon-action"
import {
  getReportSummaryMetrics,
  getReportStatusCounts,
  getTrackingReports,
  getReportCategories,
  exportTrackingReportsCsv,
  DEFAULT_SUMMARY_METRICS,
  DEFAULT_STATUS_COUNTS,
} from "@/features/report/services/report.service"
import {
  ReportSummaryMetrics,
  ReportStatusCounts,
  ScamCategoryItem,
  TrackingReportItem,
  ReportStatus,
} from "@/features/report/types/report.types"

export default function UserReportsPage() {
  const [metrics, setMetrics] = useState<ReportSummaryMetrics>(
    DEFAULT_SUMMARY_METRICS
  )
  const [metricsRevision, setMetricsRevision] = useState(0)
  const [settledMetricsRevision, setSettledMetricsRevision] = useState(-1)
  const isLoadingMetrics = settledMetricsRevision !== metricsRevision

  const [statusCounts, setStatusCounts] = useState<ReportStatusCounts>(
    DEFAULT_STATUS_COUNTS
  )
  const [categories, setCategories] = useState<ScamCategoryItem[]>([])

  const [reports, setReports] = useState<TrackingReportItem[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | ReportStatus>(
    "ALL"
  )
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDays, setSelectedDays] = useState("30")

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    let active = true
    void Promise.all([
      getReportSummaryMetrics(),
      getReportStatusCounts(),
      getReportCategories(),
    ])
      .then(([metricData, countData, catData]) => {
        if (!active) return
        setMetrics(metricData)
        setStatusCounts(countData)
        setCategories(catData)
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu ban đầu:", err)
      })
      .finally(() => {
        if (active) setSettledMetricsRevision(metricsRevision)
      })
    return () => {
      active = false
    }
  }, [metricsRevision])

  const fetchReports = useCallback(
    async (pageToLoad: number) => {
      setIsLoadingReports(true)
      setReportsError(null)
      try {
        const catId =
          selectedCategory !== "all" ? Number(selectedCategory) : undefined
        const days = selectedDays !== "all" ? Number(selectedDays) : undefined

        const res = await getTrackingReports({
          search: search.trim() || undefined,
          status: selectedStatus,
          categoryId: catId,
          days,
          page: pageToLoad - 1,
          size: 10,
          sort: "createdAt,desc",
        })

        setReports(res.items)
        setTotalPages(Math.max(1, res.totalPages))
        setTotalItems(res.totalItems)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách báo cáo tiến trình. Vui lòng thử lại."
        setReportsError(message)
        setReports([])
      } finally {
        setIsLoadingReports(false)
      }
    },
    [search, selectedStatus, selectedCategory, selectedDays]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReports(currentPage)
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchReports, currentPage])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleStatusChange = (val: "ALL" | ReportStatus) => {
    setSelectedStatus(val)
    setCurrentPage(1)
  }

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val)
    setCurrentPage(1)
  }

  const handleDaysChange = (val: string) => {
    setSelectedDays(val)
    setCurrentPage(1)
  }

  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      const catId =
        selectedCategory !== "all" ? Number(selectedCategory) : undefined
      const days = selectedDays !== "all" ? Number(selectedDays) : undefined

      const blob = await exportTrackingReportsCsv({
        search: search.trim() || undefined,
        status: selectedStatus,
        categoryId: catId,
        days,
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "scamshield_report_tracking.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Xuất đối soát CSV thành công!")
    } catch {
      toast.error("Không thể xuất file CSV. Vui lòng thử lại sau!")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6 font-sans antialiased">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground">
              Báo cáo & theo dõi tiến trình
            </h1>
            <p className="max-w-[60ch] text-sm text-muted-foreground">
              Theo dõi trạng thái kiểm duyệt, điểm uy tín và lịch sử các báo cáo
              bạn đã gửi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExpandableIconButton
              onClick={handleExportCsv}
              disabled={isExporting}
              expanded={isExporting}
              variant="outline"
              icon={
                isExporting ? (
                  <div className="motion-safe:animate-spin">
                    <CircleNotch aria-hidden="true" size={16} weight="bold" />
                  </div>
                ) : (
                  <DownloadSimple aria-hidden="true" size={16} weight="bold" />
                )
              }
              label={
                isExporting ? "Đang xuất CSV..." : "Xuất đối soát (CSV)"
              }
            />

            <Link
              href="/user/reports/new"
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus aria-hidden="true" size={16} weight="bold" />
              <span>Gửi báo cáo mới</span>
            </Link>
          </div>
        </div>

        {/* 4 Overview Metric Cards */}
        <ReportMetricsCards metrics={metrics} isLoading={isLoadingMetrics} />

        {/* Recoverable Error Callout (Zero Dead-End) */}
        {reportsError && (
          <ScamErrorCallout
            title="Chưa thể tải danh sách báo cáo"
            message={reportsError}
            preserveDraftHint={false}
            isBusy={isLoadingReports}
            onRetry={() => {
              setMetricsRevision((v) => v + 1)
              void fetchReports(currentPage)
            }}
          />
        )}

        {/* Report Tracking Filter & Table */}
        <ReportTrackingTable
          items={reports}
          statusCounts={statusCounts}
          categories={categories}
          isLoading={isLoadingReports}
          search={search}
          onSearchChange={handleSearchChange}
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          selectedDays={selectedDays}
          onDaysChange={handleDaysChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={10}
          onPageChange={setCurrentPage}
          onRefresh={() => {
            setMetricsRevision((v) => v + 1)
            void fetchReports(currentPage)
          }}
        />
      </div>
    </MotionConfig>
  )
}
