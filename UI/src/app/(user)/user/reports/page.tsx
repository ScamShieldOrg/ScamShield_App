"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { DownloadSimple, Plus } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { ReportMetricsCards } from "@/components/features/report/report-metrics-cards"
import { ReportTrackingTable } from "@/components/features/report/report-tracking-table"
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
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)

  const [statusCounts, setStatusCounts] = useState<ReportStatusCounts>(
    DEFAULT_STATUS_COUNTS
  )
  const [categories, setCategories] = useState<ScamCategoryItem[]>([])

  const [reports, setReports] = useState<TrackingReportItem[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
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

  // Load summary metrics, status counts & categories on mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingMetrics(true)
      try {
        const [metricData, countData, catData] = await Promise.all([
          getReportSummaryMetrics(),
          getReportStatusCounts(),
          getReportCategories(),
        ])
        setMetrics(metricData)
        setStatusCounts(countData)
        setCategories(catData)
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu ban đầu:", err)
      } finally {
        setIsLoadingMetrics(false)
      }
    }
    loadInitialData()
  }, [])

  // Load tracking reports with debounce / filter dependencies
  const fetchReports = useCallback(
    async (pageToLoad: number) => {
      setIsLoadingReports(true)
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
        console.error("Lỗi khi tải danh sách báo cáo tiến trình:", err)
        setReports([])
      } finally {
        setIsLoadingReports(false)
      }
    },
    [search, selectedStatus, selectedCategory, selectedDays]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports(currentPage)
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchReports, currentPage])

  // Reset page to 1 when filters change
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
    } catch (err) {
      console.error("Lỗi khi xuất CSV:", err)
      toast.error("Không thể xuất file CSV. Vui lòng thử lại sau!")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
            Báo Cáo & Theo Dõi Tiến Trình
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C6C6CE]/60 bg-white px-3.5 py-2 text-xs font-semibold text-[#131B2E] shadow-2xs hover:bg-[#FAF8FF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground"
          >
            <DownloadSimple
              size={15}
              weight="bold"
              className={isExporting ? "animate-bounce" : ""}
            />
            <span>
              {isExporting ? "Đang xuất CSV..." : "Xuất đối soát (CSV)"}
            </span>
          </button>

          <Link
            href="/user/reports/new"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0B132B] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#131B2E] active:scale-95 dark:bg-primary dark:text-primary-foreground"
          >
            <Plus size={15} weight="bold" />
            <span>Gửi Báo Cáo Mới</span>
          </Link>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <ReportMetricsCards metrics={metrics} isLoading={isLoadingMetrics} />

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
        onRefresh={() => fetchReports(currentPage)}
      />
    </div>
  )
}
