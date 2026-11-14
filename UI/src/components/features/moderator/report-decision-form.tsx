"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, ShieldWarning } from "@phosphor-icons/react"
import { ModerationDecisionPayload } from "@/features/moderator/types/moderator.types"

import { getReportCategories } from "@/features/report/services/report.service"
import type { ScamCategoryItem } from "@/features/report/types/report.types"

interface ReportDecisionFormProps {
  currentCategoryId?: number
  currentCategoryName: string
  reportId: string | number
  selectedTaxonomies: string[]
  onSubmit: (payload: ModerationDecisionPayload) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  isSubmitting?: boolean
  approvalBlocked?: boolean
}

type DecisionType = "APPROVE" | "REJECT"

export function ReportDecisionForm({
  currentCategoryId,
  currentCategoryName,
  reportId,
  selectedTaxonomies,
  onSubmit,
  onDirtyChange,
  isSubmitting = false,
  approvalBlocked = false,
}: ReportDecisionFormProps) {
  const [decision, setDecision] = useState<DecisionType | null>(null)
  const [reason, setReason] = useState<string>("")

  const [categories, setCategories] = useState<ScamCategoryItem[] | null>(null)
  const [categoryId, setCategoryId] = useState<number>()

  useEffect(() => {
    let active = true
    void getReportCategories().then(items => {
      if (active) setCategories(items)
    })
    return () => { active = false }
  }, [])

  const minLength = 20
  const isReasonValid =
    reason.trim().length <= 2000 &&
    (decision !== "REJECT" || reason.trim().length >= minLength)
  const canSubmit =
    decision !== null &&
    !(decision === "APPROVE" && approvalBlocked) &&
    isReasonValid &&
    !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !decision) return

    await onSubmit({
      reportId,
      decision,
      reason: reason.trim(),
      selectedTaxonomies,
      categoryId: categoryId === currentCategoryId ? undefined : categoryId,
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
        <ShieldWarning size={15} weight="bold" className="text-slate-400" />
        <span>QUYẾT ĐỊNH KIỂM DUYỆT</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <fieldset disabled={isSubmitting} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="moderation-category" className="block text-xs font-bold">
              Xác nhận lại loại thủ đoạn
            </label>
            <select
              id="moderation-category"
              value={categoryId === currentCategoryId ? "" : (categoryId ?? "")}
              disabled={!categories?.length}
              onChange={event => {
                const nextCategoryId = event.target.value ? Number(event.target.value) : undefined
                setCategoryId(nextCategoryId)
                onDirtyChange?.(nextCategoryId !== undefined || decision !== null || reason.length > 0)
              }}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm"
            >
              <option value="">Giữ danh mục hiện tại — {currentCategoryName}</option>
              {categories?.filter(category => category.id !== currentCategoryId).map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {categories?.length === 0 && (
              <p className="text-xs text-muted-foreground">Không có danh mục để chọn. Bạn vẫn có thể duyệt với danh mục hiện tại.</p>
            )}
          </div>
          {/* 2 Decision Action Buttons matching UI mockups and backend enum */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={approvalBlocked}
              onClick={() => {
                setDecision("APPROVE")
                onDirtyChange?.(true)
              }}
              aria-pressed={decision === "APPROVE"}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                approvalBlocked
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                  : decision === "APPROVE"
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-xs hover:bg-emerald-800 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
              }`}
            >
              <CheckCircle size={17} weight="bold" />
              <span>Phê duyệt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDecision("REJECT")
                onDirtyChange?.(true)
              }}
              aria-pressed={decision === "REJECT"}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                decision === "REJECT"
                  ? "border-red-700 bg-red-700 text-white shadow-xs hover:bg-red-800 dark:border-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  : "border-red-200 bg-red-50 text-red-800 hover:border-red-400 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
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
                {decision === "REJECT" ? "LÝ DO TỪ CHỐI *" : "GHI CHÚ"}
              </label>
              <span className="font-semibold text-black tabular-nums dark:text-white">
                {reason.trim().length}/2000 ký tự
                {decision === "REJECT" ? " · tối thiểu 20" : ""}
              </span>
            </div>

            <textarea
              id="moderation-reason"
              rows={3}
              maxLength={2000}
              required={decision === "REJECT"}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                onDirtyChange?.(decision !== null || categoryId !== undefined || e.target.value.length > 0)
              }}
              placeholder={
                decision === "REJECT"
                  ? "Nhập lý do từ chối báo cáo..."
                  : "Thêm nhận xét về nội dung hoặc bằng chứng báo cáo..."
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/40 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-700 dark:focus:bg-slate-800"
            />
          </div>

          {/* Submit Confirmation Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-xl py-3 text-xs font-bold shadow-xs transition-all ${
              canSubmit
                ? "cursor-pointer bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
            }`}
          >
            {isSubmitting
              ? "Đang ghi nhận quyết định..."
              : "Xác nhận quyết định"}
          </button>
        </fieldset>
      </form>
    </div>
  )
}
