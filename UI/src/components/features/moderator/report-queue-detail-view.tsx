"use client"

import { useState, useEffect } from "react"
import { Flag, ShieldCheck } from "@phosphor-icons/react"
import { ModeratorReportItem, ModerationDecisionPayload } from "@/features/moderator/types/moderator.types"
import { ReportEvidencePreview } from "./report-evidence-preview"
import { ReportTaxonomySelector } from "./report-taxonomy-selector"
import { ReportDecisionForm } from "./report-decision-form"

interface ReportQueueDetailViewProps {
  item: ModeratorReportItem | null
  onDecisionSubmitted: (payload: ModerationDecisionPayload) => Promise<void>
}

export function ReportQueueDetailView({
  item,
  onDecisionSubmitted,
}: ReportQueueDetailViewProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [flagged, setFlagged] = useState(false)

  useEffect(() => {
    if (item) {
      setSelectedTags(item.taxonomies || [])
      setFlagged(false)
    }
  }, [item])

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <ShieldCheck size={32} />
        </div>
        <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
          Chưa chọn hồ sơ nào
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Vui lòng chọn một ca từ danh sách hàng đợi bên trái để thẩm định.
        </p>
      </div>
    )
  }

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleFormSubmit = async (payload: ModerationDecisionPayload) => {
    setIsSubmitting(true)
    try {
      await onDecisionSubmitted(payload)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Workspace Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* Meta Row: ID & Status Badges */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {item.id}
              </span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
                {item.status}
              </span>
              <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
                {item.priority}
              </span>
            </div>

            {/* Target Identifier */}
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {item.targetIdentifier}
            </h1>

            {/* Sub-meta details */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {item.category}
              </span>
              <span>•</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {item.reportCount} báo cáo
              </span>
              <span>•</span>
              <span>Gửi bởi <strong className="text-slate-700 dark:text-slate-300">{item.reportedBy}</strong></span>
              <span>•</span>
              <span>{item.reportedAt}</span>
            </div>
          </div>

          {/* Action: Gắn cờ lạm dụng */}
          <button
            type="button"
            onClick={() => setFlagged(!flagged)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              flagged
                ? "border-rose-500 bg-rose-500 text-white shadow-xs"
                : "border-rose-300 bg-rose-50/60 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50"
            }`}
          >
            <Flag size={14} weight="bold" />
            <span>{flagged ? "Đã gắn cờ" : "Gắn cờ lạm dụng"}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Scroll Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Top 2 Cards: Phán quyết AI & Đề xuất */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Card 1: Phán quyết AI */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span className="size-2 rounded-full bg-blue-500" />
              <span>PHÁN QUYẾT AI</span>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black text-rose-600 dark:text-rose-500">
                {item.aiScore != null ? item.aiScore : "--"}
              </span>
              {item.aiScore != null && (
                <span className="text-sm font-semibold text-slate-400">
                  / 100
                </span>
              )}
            </div>

            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {item.aiRiskLevel || "Đang chờ phân tích"}
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Tin cậy: {item.aiConfidence || "--"}
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-rose-600 transition-all duration-500 dark:bg-rose-500"
                style={{ width: `${item.aiScore ?? 0}%` }}
              />
            </div>
          </div>

          {/* Card 2: Người báo cáo đề xuất */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span className="size-2 rounded-full bg-slate-400" />
              <span>NGƯỜI BÁO CÁO ĐỀ XUẤT</span>
            </div>

            <div className="mt-3 flex min-h-[72px] items-center text-xs">
              {item.reporterProposal ? (
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {item.reporterProposal}
                </p>
              ) : (
                <p className="italic text-slate-400 dark:text-slate-500">
                  Không có đề xuất
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Evidence Preview Box */}
        <ReportEvidencePreview
          evidences={item.evidences}
          completeness={item.evidenceCompleteness}
        />

        {/* Taxonomy Tagging Selector */}
        <ReportTaxonomySelector
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
        />

        {/* Final Decision Form */}
        <ReportDecisionForm
          reportId={item.id}
          selectedTaxonomies={selectedTags}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
