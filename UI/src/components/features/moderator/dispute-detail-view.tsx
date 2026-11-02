"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle, ShieldCheck } from "@phosphor-icons/react"
import {
  ModeratorDisputeItem,
  DisputeVerdictPayload,
} from "@/features/moderator/types/moderator-dispute.types"
import { DisputeEvidencePreview } from "./dispute-evidence-preview"
import { DisputeVerdictForm } from "./dispute-verdict-form"

interface DisputeDetailViewProps {
  item: ModeratorDisputeItem | null
  onVerdictSubmitted: (payload: DisputeVerdictPayload) => Promise<void>
}

export function DisputeDetailView({
  item,
  onVerdictSubmitted,
}: DisputeDetailViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <ShieldCheck size={32} />
        </div>
        <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
          Chưa chọn kháng nghị nào
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Vui lòng chọn một ca từ danh sách kháng nghị bên trái để xử lý.
        </p>
      </div>
    )
  }

  const handleFormSubmit = async (payload: DisputeVerdictPayload) => {
    setIsSubmitting(true)
    try {
      await onVerdictSubmitted(payload)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Workspace Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb reference & status pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{item.id}</span>
            <ArrowLeft size={12} weight="bold" className="text-slate-400" />
            <span>{item.originalReportId}</span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
              {item.status}
            </span>
          </div>

          {/* Original Decision Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Quyết định gốc: {item.originalDecision}</span>
          </div>
        </div>

        {/* Target Identifier */}
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {item.targetIdentifier}
        </h1>

        {/* Sub-meta details */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {item.category}
          </span>
          <span>•</span>
          <span>Kháng nghị bởi <strong className="text-slate-700 dark:text-slate-300">{item.disputedBy}</strong></span>
          <span>•</span>
          <span>{item.disputedAt}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Card: Lý do kháng nghị */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            LÝ DO KHÁNG NGHỊ
          </div>
          <p className="mt-3 text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-200">
            {item.disputeReason}
          </p>
        </div>

        {/* Card: Bằng chứng phản bác */}
        <DisputeEvidencePreview key={item.id} disputeId={item.id} evidences={item.evidences} />

        {/* Card: Phán quyết kháng nghị Form */}
        <DisputeVerdictForm
          disputeId={item.id}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
