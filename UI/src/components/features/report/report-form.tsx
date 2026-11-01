"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"
import {
  Phone,
  Globe,
  Bank,
  ShieldCheck,
  PaperPlaneTilt,
  Shield,
  CircleNotch,
  CheckCircle,
  Medal,
} from "@phosphor-icons/react"
import { ReportThreatTypeSelector } from "./report-threat-type-selector"
import { ReportFileUpload, type ReportAttachment } from "./report-file-upload"
import { validateReportFiles } from "@/features/report/utils/report-upload"
import {
  ReportThreatType,
  CreateReportPayload,
} from "@/features/report/types/report.types"

interface ReportFormProps {
  onSubmit: (payload: CreateReportPayload) => Promise<void>
  isLoading?: boolean
  uploadProgress?: number
}

export function ReportForm({
  onSubmit,
  isLoading,
  uploadProgress = 0,
}: ReportFormProps) {
  const [threatType, setThreatType] = useState<ReportThreatType | null>(null)
  const [targetIdentifier, setTargetIdentifier] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [reportedMessage, setReportedMessage] = useState("")
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const threatGroupRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const fileSectionRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Map<string, string>())
  const submittingRef = useRef(false)
  const activeRef = useRef(true)
  const isBusy = Boolean(isLoading || isSubmitting)
  const isComplete = Boolean(
    threatType &&
    targetIdentifier.trim() &&
    category.trim() &&
    description.trim() &&
    attachments.length > 0 &&
    isConfirmed
  )
  const threatTypeMissing = hasAttemptedSubmit && !threatType
  const targetMissing = hasAttemptedSubmit && !targetIdentifier.trim()
  const categoryMissing = hasAttemptedSubmit && !category.trim()
  const descriptionMissing = hasAttemptedSubmit && !description.trim()
  const confirmationMissing = hasAttemptedSubmit && !isConfirmed

  useEffect(() => {
    activeRef.current = true
    const urls = objectUrls.current
    return () => {
      activeRef.current = false
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => setIsSuccess(false), 3500)
    return () => clearTimeout(timer)
  }, [isSuccess])

  const handleRemoveAttachment = (id: string) => {
    if (submittingRef.current || isLoading) return
    const url = objectUrls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    objectUrls.current.delete(id)
    setAttachments((prev) => prev.filter((item) => item.id !== id))
    setFileError(null)
  }

  const handleAddAttachments = (files: File[]) => {
    if (submittingRef.current || isLoading || !files.length) return
    const error = validateReportFiles([
      ...attachments.map((item) => item.file),
      ...files,
    ])
    setFileError(error)
    if (error) return
    const added = files.map((file) => {
      const id = crypto.randomUUID()
      const previewUrl = URL.createObjectURL(file)
      objectUrls.current.set(id, previewUrl)
      return { id, file, previewUrl }
    })
    setAttachments([...attachments, ...added])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current || isLoading) return
    setIsSuccess(false)
    setSubmitError(null)
    if (!isComplete || !threatType) {
      setHasAttemptedSubmit(true)
      toast.warn(
        !threatType ||
          !targetIdentifier.trim() ||
          !category.trim() ||
          !description.trim()
          ? "Vui lòng nhập đầy đủ các trường thông tin bắt buộc."
          : attachments.length === 0
            ? "Vui lòng đính kèm ít nhất một tệp minh chứng."
            : "Vui lòng xác nhận thông tin cung cấp là trung thực.",
        { toastId: "report-required-fields" }
      )
      const firstMissing = !threatType
        ? threatGroupRef.current?.querySelector<HTMLButtonElement>("button")
        : !targetIdentifier.trim()
          ? targetRef.current
          : !category.trim()
            ? categoryRef.current
            : !description.trim()
              ? descriptionRef.current
              : attachments.length === 0
                ? fileSectionRef.current?.querySelector<HTMLButtonElement>(
                    "button"
                  )
                : confirmationRef.current
      firstMissing?.focus({ preventScroll: true })
      firstMissing?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      })
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    setIsSuccess(false)

    try {
      await onSubmit({
        threatType,
        targetIdentifier: targetIdentifier.trim(),
        category,
        description: description.trim(),
        reportedMessage,
        attachments: attachments.map((item) => item.file),
        isConfirmed,
      })

      if (!activeRef.current) return
      // Reset form after successful submission
      setThreatType(null)
      setTargetIdentifier("")
      setCategory("")
      setDescription("")
      setReportedMessage("")
      setAttachments([])
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrls.current.clear()
      setFileError(null)
      setIsConfirmed(false)
      setHasAttemptedSubmit(false)
      setIsSuccess(true)
    } catch (error) {
      if (activeRef.current)
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Không thể gửi báo cáo. Vui lòng thử lại."
        )
    } finally {
      submittingRef.current = false
      if (activeRef.current) setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isBusy}
      className="space-y-6 rounded-2xl border border-[#C6C6CE]/40 bg-white p-6 shadow-xs dark:border-border dark:bg-card"
    >
      <fieldset disabled={isBusy} className="min-w-0 space-y-6">
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-[#C6C6CE]/30 pb-4 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#0B132B] text-white dark:bg-primary dark:text-primary-foreground">
              <Shield size={20} weight="fill" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-bold text-[#131B2E] dark:text-foreground">
                Biểu Mẫu Tiếp Nhận Báo Cáo
              </h2>
              <p className="text-[11px] text-[#45464D] dark:text-muted-foreground">
                Quy trình 3 bước tinh gọn, bảo mật danh tính người gửi
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: Loại đe dọa */}
        <div ref={threatGroupRef} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#0B132B] font-heading text-[11px] font-bold text-white dark:bg-primary dark:text-primary-foreground">
              1
            </span>
            <h3 className="text-xs font-bold text-[#131B2E] dark:text-foreground">
              Loại đe dọa <span className="text-destructive">*</span>
            </h3>
          </div>

          <ReportThreatTypeSelector
            selectedType={threatType}
            onSelect={setThreatType}
            invalid={threatTypeMissing}
          />
          {threatTypeMissing && (
            <p
              id="report-threat-type-error"
              className="text-xs text-destructive"
            >
              Vui lòng chọn loại đe dọa cần báo cáo.
            </p>
          )}
        </div>

        {/* STEP 2: Thông tin & Bằng chứng */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#0B132B] font-heading text-[11px] font-bold text-white dark:bg-primary dark:text-primary-foreground">
              2
            </span>
            <h3 className="text-xs font-bold text-[#131B2E] dark:text-foreground">
              Thông tin & Bằng chứng
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Target Identifier Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="report-target-identifier"
                  className="text-xs font-bold text-[#131B2E] dark:text-foreground"
                >
                  Đối tượng bị báo cáo <span className="text-[#BA1A1A]">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground">
                  {!threatType && <Shield size={16} weight="bold" />}
                  {threatType === "PHONE" && <Phone size={16} weight="bold" />}
                  {threatType === "WEBSITE" && (
                    <Globe size={16} weight="bold" />
                  )}
                  {threatType === "BANK_ACCOUNT" && (
                    <Bank size={16} weight="bold" />
                  )}
                </div>
                <input
                  ref={targetRef}
                  id="report-target-identifier"
                  type="text"
                  required
                  aria-invalid={targetMissing}
                  aria-describedby={
                    targetMissing ? "report-target-error" : undefined
                  }
                  value={targetIdentifier}
                  onChange={(e) => setTargetIdentifier(e.target.value)}
                  placeholder={
                    !threatType
                      ? "Nhập số điện thoại, URL hoặc tài khoản cần báo cáo..."
                      : threatType === "PHONE"
                        ? "Nhập số điện thoại kẻ lừa đảo..."
                        : threatType === "WEBSITE"
                          ? "Nhập URL website giả mạo..."
                          : "Nhập số tài khoản ngân hàng thụ hưởng..."
                  }
                  className="w-full scroll-mt-24 rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] py-2.5 pr-3 pl-10 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden aria-invalid:border-destructive dark:border-border dark:bg-muted/30 dark:text-foreground"
                />
              </div>
              {targetMissing && (
                <p
                  id="report-target-error"
                  className="text-xs text-destructive"
                >
                  Vui lòng nhập số điện thoại, URL hoặc tài khoản cần báo cáo.
                </p>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="report-category"
                className="text-xs font-bold text-[#131B2E] dark:text-foreground"
              >
                Danh mục thủ đoạn <span className="text-[#BA1A1A]">*</span>
              </label>
              <select
                ref={categoryRef}
                id="report-category"
                required
                aria-invalid={categoryMissing}
                aria-describedby={
                  categoryMissing ? "report-category-error" : undefined
                }
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] px-3 py-2.5 text-xs font-semibold text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-muted/30 dark:text-foreground"
              >
                <option value="" disabled>
                  Chọn danh mục thủ đoạn
                </option>
                <option value="Mạo danh Cơ quan Nhà nước / Công an / VKSND">
                  Mạo danh Cơ quan Nhà nước / Công an / VKSND
                </option>
                <option value="Website Phishing đánh cắp tài khoản ngân hàng">
                  Website Phishing đánh cắp tài khoản ngân hàng
                </option>
                <option value="Tuyển dụng việc nhẹ lương cao / CTV TikTok, Shopee">
                  Tuyển dụng việc nhẹ lương cao / CTV TikTok, Shopee
                </option>
                <option value="Lừa đảo đầu tư sàn Forex / Tiền ảo đa cấp">
                  Lừa đảo đầu tư sàn Forex / Tiền ảo đa cấp
                </option>
                <option value="Mã độc giả mạo cổng dịch vụ công VNeID">
                  Mã độc giả mạo cổng dịch vụ công VNeID
                </option>
              </select>
              {categoryMissing && (
                <p
                  id="report-category-error"
                  className="text-xs text-destructive"
                >
                  Vui lòng chọn danh mục thủ đoạn.
                </p>
              )}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="report-description"
              className="text-xs font-bold text-[#131B2E] dark:text-foreground"
            >
              Mô tả ngắn gọn hành vi <span className="text-[#BA1A1A]">*</span>
            </label>
            <textarea
              ref={descriptionRef}
              id="report-description"
              rows={3}
              required
              aria-invalid={descriptionMissing}
              aria-describedby={
                descriptionMissing ? "report-description-error" : undefined
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết kịch bản, lời nói hoặc bằng chứng lừa đảo..."
              className="w-full resize-none scroll-mt-24 rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] p-3 text-xs leading-relaxed text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden aria-invalid:border-destructive dark:border-border dark:bg-muted/30 dark:text-foreground"
            />
            {descriptionMissing && (
              <p
                id="report-description-error"
                className="text-xs text-destructive"
              >
                Vui lòng mô tả ngắn gọn hành vi cần báo cáo.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="report-message"
              className="text-xs font-bold text-[#131B2E] dark:text-foreground"
            >
              Nội dung tin nhắn lừa đảo (tùy chọn)
            </label>
            <textarea
              id="report-message"
              rows={4}
              maxLength={10000}
              aria-describedby="report-message-hint"
              value={reportedMessage}
              onChange={(e) => setReportedMessage(e.target.value)}
              placeholder="Dán nguyên văn tin nhắn nghi lừa đảo mà bạn nhận được..."
              className="w-full resize-y rounded-xl border border-[#C6C6CE]/50 bg-[#FAF8FF] p-3 text-xs leading-relaxed text-[#131B2E] focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:border-border dark:bg-muted/30 dark:text-foreground"
            />
            <p
              id="report-message-hint"
              className="text-[11px] text-muted-foreground"
            >
              Có thể bỏ trống nếu không có tin nhắn. Tối đa 10.000 ký tự.
            </p>
          </div>

          {/* Evidence Attachments Upload Zone */}
          <div ref={fileSectionRef}>
            <ReportFileUpload
              attachments={attachments}
              disabled={isBusy}
              error={
                fileError ||
                (hasAttemptedSubmit && attachments.length === 0
                  ? "Vui lòng đính kèm ít nhất một tệp minh chứng."
                  : null)
              }
              onAdd={handleAddAttachments}
              onRemove={handleRemoveAttachment}
            />
          </div>
        </div>

        {/* STEP 3: Xác nhận & Gửi */}
        <div className="space-y-4 border-t border-[#C6C6CE]/30 pt-4 dark:border-border">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#0B132B] font-heading text-[11px] font-bold text-white dark:bg-primary dark:text-primary-foreground">
              3
            </span>
            <h3 className="text-xs font-bold text-[#131B2E] dark:text-foreground">
              Xác nhận & Gửi
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#00875A] dark:text-emerald-400">
            <ShieldCheck size={16} weight="fill" />
            <span>
              Báo cáo sẽ được kiểm duyệt độc lập trước khi cảnh báo cộng đồng.
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Medal
              size={16}
              weight="fill"
              className="shrink-0 text-amber-600 dark:text-amber-400"
            />
            <span>
              Báo cáo được xác thực giúp bạn nhận{" "}
              <strong className="font-semibold text-foreground">
                50 điểm uy tín
              </strong>{" "}
              và nâng thứ hạng.
            </span>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[#131B2E] dark:text-foreground">
            <input
              ref={confirmationRef}
              type="checkbox"
              required
              aria-invalid={confirmationMissing}
              aria-describedby={
                confirmationMissing ? "report-confirmation-error" : undefined
              }
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="size-4 rounded-md border-[#C6C6CE] text-[#0B132B] focus:ring-0 dark:border-border"
            />
            <span>Tôi xác nhận thông tin cung cấp là trung thực.</span>
          </label>
          {confirmationMissing && (
            <p
              id="report-confirmation-error"
              className="text-xs text-destructive"
            >
              Vui lòng xác nhận thông tin cung cấp là trung thực.
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isBusy}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B132B] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#131B2E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90",
                !isComplete && "opacity-50"
              )}
            >
              {isBusy ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Đang gửi báo cáo...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={16} weight="fill" />
                  <span>Gửi báo cáo</span>
                </>
              )}
            </button>

            {isSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00875A] dark:text-emerald-400">
                <CheckCircle size={16} weight="fill" />
                <span>Gửi báo cáo thành công!</span>
              </span>
            )}
          </div>
          {isBusy && attachments.length > 0 && (
            <div
              role="status"
              className="space-y-1.5 text-xs text-muted-foreground"
            >
              <span>
                {uploadProgress < 100
                  ? `Đang tải tệp đính kèm: ${uploadProgress}%`
                  : "Đã tải tệp. Đang lưu báo cáo, vui lòng chờ..."}
              </span>
              <div
                role="progressbar"
                aria-label="Tiến độ tải tệp đính kèm"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {submitError && (
            <p role="alert" className="text-xs text-destructive">
              {submitError}
            </p>
          )}
        </div>
      </fieldset>
    </form>
  )
}
