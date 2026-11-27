"use client"

import { ReportSubmissionError } from "@/components/features/report/report-submission-error"

import { useState, useEffect } from "react"
import { ArrowDown, ShieldCheck } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { ReportForm } from "@/components/features/report/report-form"
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
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
      <header className="relative isolate overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white dark:border-slate-700">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_#164e63_0%,_transparent_65%)]" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 sm:size-12">
              <ShieldCheck size={25} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
                Báo cáo đối tượng lừa đảo
              </h1>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-300">
                Cung cấp thông tin và minh chứng để kiểm duyệt viên xác minh.
              </p>
            </div>
          </div>
          <a
            href="#report-recent"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none"
          >
            Báo cáo gần đây
            <ArrowDown size={15} aria-hidden="true" />
          </a>
        </div>
        <nav aria-label="Các phần của báo cáo" className="border-t border-white/15 bg-white/5 px-2 sm:px-4">
          <ol className="grid grid-cols-3 divide-x divide-white/15">
            {[
              ["report-target", "Đối tượng"],
              ["report-evidence", "Thông tin và minh chứng"],
              ["report-confirmation", "Xác nhận"],
            ].map(([id, label], index) => (
              <li key={id} className="min-w-0 p-1">
                <a href={`#${id}`} className="flex min-h-12 items-center gap-1.5 rounded-lg px-1.5 py-2 text-xs leading-snug font-semibold text-slate-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-sm">
                  <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-cyan-300/15 text-[11px] text-cyan-100 sm:size-6">{index + 1}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <ReportForm
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        uploadProgress={uploadProgress}
      />

      <div id="report-recent" tabIndex={-1} className="min-w-0 scroll-mt-24">
        <RecentReportsTable items={reports} isLoading={isLoadingReports} />
      </div>
    </div>
  )
}
