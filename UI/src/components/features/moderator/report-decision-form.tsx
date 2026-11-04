"use client"

import { useState } from "react"
import { CheckCircle, XCircle, ShieldWarning } from "@phosphor-icons/react"
import { ModerationDecisionPayload } from "@/features/moderator/types/moderator.types"

interface ReportDecisionFormProps {
  reportId: string | number
  selectedTaxonomies: string[]
  onSubmit: (payload: ModerationDecisionPayload) => Promise<void>
  isSubmitting?: boolean
}

type DecisionType = "APPROVE" | "REJECT"

export function ReportDecisionForm({
  reportId,
  selectedTaxonomies,
  onSubmit,
  isSubmitting = false,
}: ReportDecisionFormProps) {
  const [decision, setDecision] = useState<DecisionType | null>(null)
  const [reason, setReason] = useState<string>("")

  const minLength = 20
  const isReasonValid = reason.trim().length >= minLength
  const canSubmit = decision !== null && isReasonValid && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !decision) return

    await onSubmit({
      reportId,
      decision,
      reason: reason.trim(),
      selectedTaxonomies,
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        <ShieldWarning size={15} weight="bold" className="text-slate-400" />
        <span>QUYẾT ĐỊNH KIỂM DUYỆT</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* 2 Decision Action Buttons matching UI mockups and backend enum */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDecision("APPROVE")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
              decision === "APPROVE"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs ring-2 ring-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                : "border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            }`}
          >
            <CheckCircle size={17} weight="bold" />
            <span>Phê duyệt</span>
          </button>

          <button
            type="button"
            onClick={() => setDecision("REJECT")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-all ${
              decision === "REJECT"
                ? "border-rose-500 bg-rose-50 text-rose-700 shadow-2xs ring-2 ring-rose-500/20 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                : "border-slate-200 bg-white text-rose-700 hover:bg-rose-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
            }`}
          >
            <XCircle size={17} weight="bold" />
            <span>Từ chối</span>
          </button>
        </div>

        {/* Mandatory Reason Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="moderation-reason"
              className="font-bold text-slate-700 dark:text-slate-300"
            >
              LÝ DO BẮT BUỘC *{" "}
              <span className="font-normal text-slate-500 dark:text-slate-400">
                (Lưu vào audit trail bất biến)
              </span>
            </label>
            <span
              className={`font-semibold ${
                isReasonValid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
              }`}
            >
              {reason.trim().length}/{minLength} ký tự tối thiểu
            </span>
          </div>

          <textarea
            id="moderation-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bắt buộc: Giải thích lý do quyết định, bằng chứng chính xét đến, mã SS liên quan, và bất kỳ ghi chú quan trọng nào..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/40 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-700 dark:focus:bg-slate-800"
          />
        </div>

        {/* Submit Confirmation Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-xl py-3 text-xs font-bold transition-all shadow-xs ${
            canSubmit
              ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
              : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Đang ghi nhận quyết định..." : "Xác nhận quyết định"}
        </button>
      </form>
    </div>
  )
}
