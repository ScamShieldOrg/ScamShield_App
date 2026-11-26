"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle, XCircle, ShieldWarning } from "@phosphor-icons/react"
import { ModerationDecisionPayload } from "@/features/moderator/types/moderator.types"
import { getReportCategories } from "@/features/report/services/report.service"
import type { ScamCategoryItem } from "@/features/report/types/report.types"
import { cn } from "@/lib/utils"

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
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let active = true
    void getReportCategories().then((items) => {
      if (active) setCategories(items)
    })
    return () => {
      active = false
    }
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
    <section className="rounded-xl border border-black/10 bg-card p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] sm:p-6 dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
      <h2 className="flex items-center gap-2 border-b border-border/70 pb-4 font-heading text-base font-bold tracking-[-0.02em] text-foreground">
        <ShieldWarning
          size={18}
          className="text-muted-foreground"
          aria-hidden="true"
        />
        <span>Quyết định kiểm duyệt</span>
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-4">
        <fieldset disabled={isSubmitting} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="moderation-category"
              className="block text-xs font-semibold text-foreground"
            >
              Xác nhận lại loại thủ đoạn
            </label>
            <select
              id="moderation-category"
              value={categoryId === currentCategoryId ? "" : (categoryId ?? "")}
              disabled={!categories?.length}
              onChange={(event) => {
                const nextCategoryId = event.target.value
                  ? Number(event.target.value)
                  : undefined
                setCategoryId(nextCategoryId)
                onDirtyChange?.(
                  nextCategoryId !== undefined ||
                    decision !== null ||
                    reason.length > 0
                )
              }}
              className="min-h-10 w-full rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
            >
              <option value="">
                Giữ danh mục hiện tại — {currentCategoryName}
              </option>
              {categories
                ?.filter((category) => category.id !== currentCategoryId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            {categories?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Không có danh mục để chọn. Bạn vẫn có thể duyệt với danh mục
                hiện tại.
              </p>
            )}
          </div>

          <fieldset className="space-y-3 rounded-lg bg-muted/35 p-4">
            <legend className="px-1 text-xs font-semibold text-foreground">
              Checklist xác minh báo cáo
            </legend>
            <div className="space-y-1 text-sm">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  <strong>Khớp đối tượng.</strong> Đối chiếu số điện thoại, tên
                  miền hoặc tài khoản trong minh chứng. Nếu nghi mạo danh, kiểm
                  tra kênh chính thức của tổ chức.
                </span>
              </label>
              <a
                href="https://dichvucong.online.gov.vn/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-6 inline-block text-xs font-medium text-primary underline underline-offset-2"
              >
                Cổng thông tin quản lý hoạt động thương mại điện tử
              </a>
            </div>
            <div className="space-y-1 text-sm">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  <strong>Khớp dấu hiệu.</strong> Chỉ ra hành vi trong minh
                  chứng và đối chiếu với cảnh báo chính thức.
                </span>
              </label>
              <a
                href="https://cdannd1.bocongan.gov.vn/api/Resources/File/2023/cam_nang_nhan_dien_va_phong_tranh_ldtt_7493280830.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-6 inline-block text-xs font-medium text-primary underline underline-offset-2"
              >
                Cẩm nang nhận diện và phòng tránh lừa đảo trực tuyến (PDF)
              </a>
            </div>
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>
                <strong>Ghi căn cứ quyết định.</strong> Nêu tệp nào thể hiện
                hành vi gì và liên quan thế nào đến đối tượng. Nếu thiếu căn cứ,
                ghi rõ thông tin cần bổ sung.
              </span>
            </label>
          </fieldset>

          {/* Calm Authority Decision Choice (leaves Submit as the single Primary CTA) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={approvalBlocked}
              onClick={() => {
                setDecision("APPROVE")
                onDirtyChange?.(true)
              }}
              aria-pressed={decision === "APPROVE"}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,transform] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                approvalBlocked
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                  : decision === "APPROVE"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-500/30 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "border-black/10 bg-background text-foreground hover:border-emerald-500/30 hover:bg-emerald-500/5 dark:border-white/10"
              )}
            >
              <CheckCircle
                aria-hidden="true"
                size={18}
                weight={decision === "APPROVE" ? "fill" : "bold"}
                className={
                  approvalBlocked
                    ? "text-muted-foreground"
                    : "text-emerald-600 dark:text-emerald-400"
                }
              />
              <span>Phê duyệt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDecision("REJECT")
                onDirtyChange?.(true)
              }}
              aria-pressed={decision === "REJECT"}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,transform] duration-120 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                decision === "REJECT"
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-900 ring-1 ring-rose-500/30 dark:border-rose-400/50 dark:bg-rose-500/20 dark:text-rose-100"
                  : "border-black/10 bg-background text-foreground hover:border-rose-500/30 hover:bg-rose-500/5 dark:border-white/10"
              )}
            >
              <XCircle
                aria-hidden="true"
                size={18}
                weight={decision === "REJECT" ? "fill" : "bold"}
                className="text-rose-600 dark:text-rose-400"
              />
              <span>Từ chối</span>
            </button>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="moderation-reason"
                className="font-semibold text-foreground"
              >
                {decision === "REJECT" ? (
                  <>
                    Lý do từ chối{" "}
                    <span className="text-rose-600 dark:text-rose-400">*</span>
                  </>
                ) : (
                  "Ghi chú"
                )}
              </label>
              <span className="font-medium text-muted-foreground tabular-nums">
                {reason.trim().length.toLocaleString("vi-VN")}/2.000 ký tự
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
                onDirtyChange?.(
                  decision !== null ||
                    categoryId !== undefined ||
                    e.target.value.length > 0
                )
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              placeholder={
                decision === "REJECT"
                  ? "Nhập lý do từ chối báo cáo (tối thiểu 20 ký tự)..."
                  : "Thêm nhận xét về nội dung hoặc bằng chứng báo cáo..."
              }
              className="w-full scroll-mt-24 rounded-lg border border-black/10 bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
            />
          </div>

          {/* Single Primary CTA */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:enabled:bg-primary/90 active:enabled:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
          >
            {isSubmitting
              ? "Đang ghi nhận quyết định..."
              : "Xác nhận quyết định"}
          </button>
        </fieldset>
      </form>
    </section>
  )
}
