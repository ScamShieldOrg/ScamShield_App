"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { ReportForm } from "@/components/features/report/report-form"
import { ReportPrivacyNotice } from "@/components/features/report/report-privacy-notice"
import { RecentReportsTable } from "@/components/features/report/recent-reports-table"
import {
  submitScamReport,
  getMyReports,
} from "@/features/report/services/report.service"
import {
  CreateReportPayload,
  RecentReportItem,
} from "@/features/report/types/report.types"

export default function UserReportsNewPage() {
  const [reports, setReports] = useState<RecentReportItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoadingReports, setIsLoadingReports] = useState(true)

  useEffect(() => {
    async function loadReports() {
      setIsLoadingReports(true)
      try {
        const data = await getMyReports()
        setReports(data || [])
      } catch {
        setReports([])
      } finally {
        setIsLoadingReports(false)
      }
    }
    loadReports()
  }, [])

  const handleSubmit = async (payload: CreateReportPayload) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setUploadProgress(0)
    try {
      const res = await submitScamReport(payload, setUploadProgress)
      if (res.success) {
        toast.success("Đã gửi báo cáo. Vui lòng theo dõi kết quả kiểm duyệt.")
        const newReport: RecentReportItem = {
          id: res.reportId,
          targetValue: payload.targetIdentifier,
          targetType: payload.threatType,
          category: payload.category,
          submittedDate: "Vừa xong",
          evidenceCount: res.evidenceCount,
          status: "PENDING",
          rewardPoints: res.rewardPoints,
        }
        setReports((prev) => [newReport, ...prev])
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể gửi báo cáo lừa đảo. Vui lòng thử lại!"
      )
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page title and contextual privacy guidance */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
          Báo Cáo Đối Tượng Lừa Đảo
        </h1>
        <p className="pt-1 text-xs text-[#45464D] dark:text-muted-foreground">
          Chung tay làm sạch không gian mạng. <ReportPrivacyNotice />
        </p>
      </div>

      {/* 3-Step Report Submission Form */}
      <ReportForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        uploadProgress={uploadProgress}
      />

      {/* Recent User Reports Table */}
      <RecentReportsTable items={reports} isLoading={isLoadingReports} />
    </div>
  )
}
