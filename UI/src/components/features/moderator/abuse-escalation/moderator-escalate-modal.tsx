"use client"

import { useState } from "react"
import {
  WarningCircle,
  CheckCircle,
  X,
  CircleNotch,
  Flag,
} from "@phosphor-icons/react"
import type { ModeratorReportItem } from "@/features/moderator/types/moderator.types"
import {
  moderatorAbuseService,
  type CreateAbuseEscalationPayload,
} from "@/features/moderator/services/moderator-abuse.service"

interface ModeratorEscalateModalProps {
  isOpen: boolean
  onClose: () => void
  report: ModeratorReportItem
  onSuccess?: (escalationCode: string) => void
}

const FLAG_TYPE_OPTIONS: {
  value: CreateAbuseEscalationPayload["flagType"]
  label: string
  description: string
}[] = [
  {
    value: "BULK_REPORTING",
    label: "Báo cáo hàng loạt (Bulk Reporting)",
    description: "Gửi lượng lớn báo cáo nhắm đến nhiều đối tượng trong thời gian ngắn",
  },
  {
    value: "FALSE_REPORTING",
    label: "Báo cáo sai sự thật (False Reporting)",
    description: "Cố ý bịa đặt hoặc vu khống các tổ chức / cá nhân uy tín",
  },
  {
    value: "SPAM",
    label: "Spam báo cáo (Spam)",
    description: "Gửi trùng lặp nội dung, hình ảnh hoặc báo cáo rác vô căn cứ",
  },
  {
    value: "HARASSMENT",
    label: "Quấy rối / Phá hoại (Harassment)",
    description: "Hành vi cố ý làm nghẽn hàng đợi hoặc quấy rối đối tượng bị báo cáo",
  },
  {
    value: "OTHER",
    label: "Hành vi lạm dụng khác",
    description: "Dấu hiệu bất thường khác cần sự can thiệp của Quản trị viên",
  },
]

export function ModeratorEscalateModal({
  isOpen,
  onClose,
  report,
  onSuccess,
}: ModeratorEscalateModalProps) {
  const reporter = report.reporterContext
  const userId = reporter?.userId
  const reportNumericId = report.rawId ?? parseInt(report.id.replace(/\D/g, ""), 10)

  const [flagType, setFlagType] =
    useState<CreateAbuseEscalationPayload["flagType"]>("BULK_REPORTING")
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCode, setSuccessCode] = useState<string | null>(null)

  if (!isOpen) return null

  const valid = reason.trim().length >= 20 && !isSubmitting && !!userId && !!reportNumericId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || !userId || !reportNumericId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await moderatorAbuseService.createEscalation(userId, {
        flagType,
        reason: reason.trim(),
        evidence: evidence.trim() || undefined,
        reportIds: [reportNumericId],
      })

      setSuccessCode(result.escalationCode)
      if (onSuccess) onSuccess(result.escalationCode)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể chuyển hồ sơ lạm dụng cho Quản trị viên."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <Flag size={20} weight="fill" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Chuyển nghi vấn lạm dụng cho Quản trị viên
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hồ sơ sẽ được tạo ở trạng thái Chờ duyệt (PENDING) để Quản trị viên xem xét xử phạt.
            </p>
          </div>
        </div>

        {/* Success View */}
        {successCode ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <CheckCircle size={22} weight="fill" className="shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="font-heading text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  Đã chuyển hồ sơ lạm dụng thành công!
                </h3>
                <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
                  Mã hồ sơ: <span className="font-mono font-bold">{successCode}</span>. Quản trị viên
                  đã nhận được hồ sơ trong hàng đợi và sẽ thẩm tra để ra quyết định tạm khóa hoặc cấm tài khoản.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Target Account Summary */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Tài khoản bị xem xét:
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {userId ? `ID: ${userId}` : "Chưa xác định ID"}
                </span>
              </div>
              <p className="mt-1 font-heading text-sm font-bold text-slate-900 dark:text-white">
                {report.reportedBy}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                {reporter?.email || "Chưa có email"} · SĐT: {reporter?.phoneNumber || "Chưa có"} · Điểm uy tín:{" "}
                {reporter?.reputationPoints ?? "—"}
              </p>
              <div className="mt-2 border-t border-slate-200/60 pt-2 text-[11px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
                Báo cáo đính kèm làm bằng chứng:{" "}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {report.id} ({report.targetIdentifier})
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Flag Type */}
            <div>
              <label className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300">
                LOẠI DẤU HIỆU LẠM DỤNG <span className="text-rose-500">*</span>
              </label>
              <select
                value={flagType}
                onChange={(e) =>
                  setFlagType(e.target.value as CreateAbuseEscalationPayload["flagType"])
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
              >
                {FLAG_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="escalation-reason"
                  className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300"
                >
                  LÝ DO CHUYỂN XỬ LÝ <span className="text-rose-500">*</span>
                </label>
                {reason.trim().length > 0 && reason.trim().length < 20 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    Cần thêm {20 - reason.trim().length} ký tự
                  </span>
                )}
              </div>
              <textarea
                id="escalation-reason"
                required
                minLength={20}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mô tả cụ thể hành vi lạm dụng, bằng chứng và lý do đề nghị xử lý (tối thiểu 20 ký tự)..."
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Bắt buộc · Lưu vào nhật ký kiểm toán cùng danh tính kiểm duyệt viên
              </p>
            </div>

            {/* Additional Evidence Notes */}
            <div>
              <label
                htmlFor="escalation-evidence"
                className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300"
              >
                GHI CHÚ BẰNG CHỨNG BỔ SUNG (TÙY CHỌN)
              </label>
              <input
                id="escalation-evidence"
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Ví dụ: Đối tượng là hotline chính thức ngân hàng, người gửi đã gửi 5 báo cáo tương tự..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            {/* Information Notice */}
            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-[11px] text-sky-900 leading-relaxed dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
              Gắn cờ lạm dụng sẽ chuyển hồ sơ sang hàng đợi của Quản trị viên (Admin). Thao tác này chưa khóa tài khoản người dùng ngay lập tức.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!valid || isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950"
              >
                {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
                {isSubmitting ? "Đang gửi..." : "Gắn cờ & chuyển Quản trị viên"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
