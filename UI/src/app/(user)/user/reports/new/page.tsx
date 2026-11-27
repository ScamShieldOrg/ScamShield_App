"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MotionConfig } from "motion/react"
import { ArrowLeft } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { ReportSubmissionError } from "@/components/features/report/report-submission-error"
import { ReportForm } from "@/components/features/report/report-form"
import { ReportPrivacyNotice } from "@/components/features/report/report-privacy-notice"
import { RecentReportsTable } from "@/components/features/report/recent-reports-table"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
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
  const [reportsRevision, setReportsRevision] = useState(0)
  const [settledRevision, setSettledRevision] = useState(-1)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const isLoadingReports = settledRevision !== reportsRevision

  useEffect(() => {
    let active = true
    void getMyReports()
      .then((data) => {
        if (!active) return
        setReports(data || [])
        setReportsError(null)
      })
      .catch((err) => {
        if (!active) return
        setReports([])
        setReportsError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách báo cáo gần đây."
        )
      })
      .finally(() => {
        if (active) setSettledRevision(reportsRevision)
      })
    return () => {
      active = false
    }
  }, [reportsRevision])

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
          category: res.categoryName,
          submittedDate: "Vừa xong",
          evidenceCount: res.evidenceCount,
          status: "PENDING",
          rewardPoints: res.rewardPoints,
        }
        setReports((prev) => [newReport, ...prev])
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể gửi báo cáo lừa đảo. Vui lòng thử lại!"
      toast.error(<ReportSubmissionError message={message} />)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-8 font-sans antialiased">
        {/* Focused Form Column */}
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="space-y-2">
            <Link
              href="/user/reports"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowLeft aria-hidden="true" size={14} weight="bold" />
              <span>Quay lại</span>
            </Link>
            <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground">
              Báo cáo đối tượng lừa đảo
            </h1>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
              Chung tay làm sạch không gian mạng. <ReportPrivacyNotice />
            </p>
          </div>

          <ReportForm
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Recent User Reports */}
        <div className="space-y-4">
          {reportsError && (
            <ScamErrorCallout
              title="Chưa thể tải báo cáo gần đây"
              message={reportsError}
              preserveDraftHint={false}
              isBusy={isLoadingReports}
              onRetry={() => setReportsRevision((v) => v + 1)}
            />
          )}
          <RecentReportsTable
            items={reports}
            isLoading={isLoadingReports}
            onRefresh={() => setReportsRevision((v) => v + 1)}
          />
        </div>
      </div>
    </MotionConfig>
  )
}
