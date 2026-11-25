"use client"

import { getReportTargetTypeWarning } from "@/features/report/utils/report-target"
import { formatReportPhoneInput } from "@/features/report/utils/report-phone"
import {
  clearReportPrefill,
  extractTrailingDigits,
  parseCheckId,
  peekReportPrefill,
  threatTypeFromInputType,
  truncateText,
} from "./report-prefill-helpers"

import { Combobox } from "@base-ui/react/combobox"
import { dashboardService } from "@/features/dashboard/services/dashboard.service"
import type { DashboardRegionOption } from "@/features/dashboard/types/dashboard.types"
import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ReportSubmissionError } from "./report-submission-error"
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
  MapPin,
} from "@phosphor-icons/react"
import { ReportThreatTypeSelector } from "./report-threat-type-selector"
import { ReportFileUpload, type ReportAttachment } from "./report-file-upload"
import { validateReportFiles } from "@/features/report/utils/report-upload"
import { getReportCategories } from "@/features/report/services/report.service"
import {
  ScamCategoryItem,
  ReportThreatType,
  CreateReportPayload,
} from "@/features/report/types/report.types"
import { getScamCheckResult } from "@/features/check/services/check.service"

const reportInputClass =
  "min-h-10 w-full scroll-mt-24 rounded-lg border border-black/10 bg-background py-2 pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-rose-500/70 dark:border-white/10"

interface ReportFormProps {
  onSubmit: (payload: CreateReportPayload) => Promise<void>
  isLoading?: boolean
  uploadProgress?: number
}

export function ReportForm(props: ReportFormProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 rounded-xl border border-black/10 bg-card p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
          <p className="text-sm text-muted-foreground">
            Đang chuẩn bị biểu mẫu báo cáo...
          </p>
        </div>
      }
    >
      <ReportFormContent {...props} />
    </Suspense>
  )
}

function ReportFormContent({
  onSubmit,
  isLoading,
  uploadProgress = 0,
}: ReportFormProps) {
  const searchParams = useSearchParams()
  const scanIdParam = searchParams.get("scanId")?.trim() ?? ""
  const checkIdParam = searchParams.get("checkId")?.trim() ?? ""

  const [prefillDraft] = useState(() => peekReportPrefill())
  const [threatType, setThreatType] = useState<ReportThreatType | null>(() =>
    threatTypeFromInputType(prefillDraft?.inputType)
  )
  const [targetIdentifier, setTargetIdentifier] = useState(
    () => prefillDraft?.targetIdentifier?.trim() ?? ""
  )
  const [targetTouched, setTargetTouched] = useState(false)

  const [regions, setRegions] = useState<DashboardRegionOption[]>([])
  const [regionName, setRegionName] = useState("")
  const [regionError, setRegionError] = useState("")
  const [regionRevision, setRegionRevision] = useState(0)
  const regionRef = useRef<HTMLInputElement>(null)
  const regionCode = regions.find((r) => r.name === regionName)?.code ?? ""

  useEffect(() => {
    let active = true
    void dashboardService
      .getFilters()
      .then((data) => {
        if (!active) return
        setRegions(data.regions)
        setRegionError("")
      })
      .catch(() => {
        if (active) {
          setRegionError("Không thể tải tỉnh/thành. Vui lòng thử lại.")
        }
      })
    return () => {
      active = false
    }
  }, [regionRevision])

  const [categories, setCategories] = useState<ScamCategoryItem[]>([])
  const [categoriesRevision, setCategoriesRevision] = useState(0)
  const [settledCategoriesRevision, setSettledCategoriesRevision] =
    useState(-1)
  const categoriesLoading = settledCategoriesRevision !== categoriesRevision

  useEffect(() => {
    let active = true
    void getReportCategories()
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch(() => {
        if (active) setCategories([])
      })
      .finally(() => {
        if (active) setSettledCategoriesRevision(categoriesRevision)
      })
    return () => {
      active = false
    }
  }, [categoriesRevision])

  const [category, setCategory] = useState("")
  const [description, setDescription] = useState(
    () => prefillDraft?.description?.trim() ?? ""
  )
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const threatGroupRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const fileSectionRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Map<string, string>())
  const submittingRef = useRef(false)
  const activeRef = useRef(true)
  const prefillConsumedRef = useRef(false)

  const isBusy = Boolean(isLoading || isSubmitting)
  const typeWarning = getReportTargetTypeWarning(threatType, targetIdentifier)
  const showTypeWarning = (targetTouched || hasAttemptedSubmit) && typeWarning
  const isComplete = Boolean(
    threatType &&
      targetIdentifier.trim() &&
      !typeWarning &&
      category.trim() &&
      regionCode &&
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
    if (prefillDraft) {
      prefillConsumedRef.current = true
      clearReportPrefill()
    }
    if (prefillConsumedRef.current) return
    if (!scanIdParam) return

    const scanId = scanIdParam
    let cancelled = false

    const loadPrefill = async () => {
      const checkId = parseCheckId(
        checkIdParam || extractTrailingDigits(scanId)
      )
      if (!checkId) return

      try {
        const result = await getScamCheckResult(checkId)
        if (cancelled) return
        const resultThreatType = threatTypeFromInputType(result.inputType)
        if (resultThreatType) setThreatType(resultThreatType)
        const matchedValue = result.matchedIndicator?.value?.trim()
        if (matchedValue) setTargetIdentifier(matchedValue)
        const summary =
          result.aiDetails?.verdict.summary?.trim() ||
          result.explanation?.trim()
        if (summary) setDescription(truncateText(summary, 300))
      } catch {
        // Expired session or deleted check: leave form empty intentionally.
      }
    }

    void loadPrefill()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIdParam, scanIdParam])

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
    const timer = setTimeout(() => setIsSuccess(false), 4000)
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
    if (typeWarning) {
      setHasAttemptedSubmit(true)
      setTargetTouched(true)
      targetRef.current?.focus()
      return
    }
    if (!isComplete || !threatType) {
      setHasAttemptedSubmit(true)
      toast.warn(
        !threatType ||
          !targetIdentifier.trim() ||
          !category.trim() ||
          !regionCode ||
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
          : !regionCode
            ? regionRef.current
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
        targetIdentifier:
          threatType === "PHONE"
            ? targetIdentifier.replace(/\s/g, "")
            : targetIdentifier.trim(),
        category,
        description: description.trim(),
        regionCode,
        attachments: attachments.map((item) => item.file),
        isConfirmed,
      })

      if (!activeRef.current) return
      setThreatType(null)
      setTargetIdentifier("")
      setTargetTouched(false)
      setCategory("")
      setRegionName("")
      setDescription("")
      setAttachments([])
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrls.current.clear()
      setFileError(null)
      setIsConfirmed(false)
      setHasAttemptedSubmit(false)
      setIsSuccess(true)
    } catch (error) {
      if (activeRef.current) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Không thể gửi báo cáo. Vui lòng thử lại."
        )
      }
    } finally {
      submittingRef.current = false
      if (activeRef.current) setIsSubmitting(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isBusy}
      className="rounded-xl border border-black/10 bg-card shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]"
    >
      <fieldset disabled={isBusy} className="min-w-0 divide-y divide-border/70">
        {/* Form Header */}
        <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield aria-hidden="true" size={20} weight="fill" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold tracking-[-0.02em] text-foreground">
              Biểu mẫu tiếp nhận báo cáo
            </h2>
            <p className="text-xs text-muted-foreground">
              Hoàn tất 3 bước ngắn gọn bên dưới để gửi bằng chứng kiểm duyệt.
            </p>
          </div>
        </div>

        {/* STEP 1: Loại đối tượng báo cáo */}
        <div ref={threatGroupRef} className="space-y-3 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-xs font-bold text-primary-foreground tabular-nums">
              1
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              Loại đối tượng báo cáo{" "}
              <span className="text-rose-600 dark:text-rose-400">*</span>
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
              className="text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              Vui lòng chọn loại đối tượng báo cáo.
            </p>
          )}
        </div>

        {/* STEP 2: Thông tin & Bằng chứng */}
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-xs font-bold text-primary-foreground tabular-nums">
              2
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              Thông tin & bằng chứng
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Target Identifier Input */}
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="report-target-identifier"
                className="block text-xs font-semibold text-foreground"
              >
                Đối tượng bị báo cáo{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                  {!threatType && (
                    <Shield aria-hidden="true" size={16} weight="bold" />
                  )}
                  {threatType === "PHONE" && (
                    <Phone aria-hidden="true" size={16} weight="bold" />
                  )}
                  {threatType === "WEBSITE" && (
                    <Globe aria-hidden="true" size={16} weight="bold" />
                  )}
                  {threatType === "BANK_ACCOUNT" && (
                    <Bank aria-hidden="true" size={16} weight="bold" />
                  )}
                </div>
                <input
                  ref={targetRef}
                  id="report-target-identifier"
                  type="text"
                  required
                  aria-invalid={targetMissing || Boolean(showTypeWarning)}
                  aria-describedby={
                    targetMissing
                      ? "report-target-error"
                      : showTypeWarning
                        ? "report-target-type-warning"
                        : undefined
                  }
                  value={
                    threatType === "PHONE" || threatType === null
                      ? formatReportPhoneInput(targetIdentifier)
                      : targetIdentifier
                  }
                  onChange={(e) => setTargetIdentifier(e.target.value)}
                  onBlur={() => setTargetTouched(true)}
                  placeholder={
                    !threatType
                      ? "Nhập số điện thoại, URL hoặc tài khoản cần báo cáo..."
                      : threatType === "PHONE"
                        ? "Nhập số điện thoại kẻ lừa đảo..."
                        : threatType === "WEBSITE"
                          ? "Nhập URL website giả mạo..."
                          : "Nhập số tài khoản ngân hàng thụ hưởng..."
                  }
                  className={cn(reportInputClass, "font-mono")}
                />
              </div>
              {showTypeWarning && (
                <p
                  id="report-target-type-warning"
                  role="alert"
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {showTypeWarning}
                </p>
              )}
              {targetMissing && (
                <p
                  id="report-target-error"
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  Vui lòng nhập số điện thoại, URL hoặc tài khoản cần báo cáo.
                </p>
              )}
            </div>

            {/* Province selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="report-region"
                className="block text-xs font-semibold text-foreground"
              >
                Tỉnh/thành của bạn{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <Combobox.Root
                items={regions.map((r) => r.name)}
                value={regionCode ? regionName : null}
                inputValue={regionName}
                onInputValueChange={setRegionName}
                onValueChange={(value) => setRegionName(value ?? "")}
                disabled={isBusy || regions.length === 0}
              >
                <div className="relative">
                  <MapPin
                    size={16}
                    weight="bold"
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <Combobox.Input
                    ref={regionRef}
                    id="report-region"
                    required
                    autoComplete="off"
                    placeholder="Nhập tên tỉnh/thành..."
                    aria-invalid={hasAttemptedSubmit && !regionCode}
                    className={reportInputClass}
                  />
                </div>
                <Combobox.Portal>
                  <Combobox.Positioner
                    anchor={regionRef}
                    align="start"
                    sideOffset={6}
                    className="z-50 w-[var(--anchor-width)] max-w-[var(--available-width)]"
                  >
                    <Combobox.Popup className="w-full overflow-hidden rounded-xl border border-black/10 bg-popover py-1 text-sm text-popover-foreground shadow-[0_12px_36px_rgb(15,23,42,0.14)] dark:border-white/12">
                      <Combobox.Empty className="px-3 py-3 text-xs text-muted-foreground">
                        Không tìm thấy tỉnh/thành phù hợp.
                      </Combobox.Empty>
                      <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain">
                        {(name: string) => (
                          <Combobox.Item
                            key={name}
                            value={name}
                            className="cursor-pointer px-3 py-2.5 text-sm transition-colors outline-none data-[highlighted]:bg-muted data-[selected]:font-semibold"
                          >
                            {name}
                          </Combobox.Item>
                        )}
                      </Combobox.List>
                    </Combobox.Popup>
                  </Combobox.Positioner>
                </Combobox.Portal>
              </Combobox.Root>
              {hasAttemptedSubmit && !regionCode && (
                <p
                  role="alert"
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  Vui lòng chọn một tỉnh/thành trong danh sách.
                </p>
              )}
              {regionError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {regionError}{" "}
                  <button
                    type="button"
                    onClick={() => setRegionRevision((v) => v + 1)}
                    className="cursor-pointer font-semibold underline underline-offset-2"
                  >
                    Tải lại danh sách
                  </button>
                </p>
              )}
            </div>

            {/* Category select */}
            <div className="space-y-1.5">
              <label
                htmlFor="report-category"
                className="block text-xs font-semibold text-foreground"
              >
                Danh mục thủ đoạn{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <select
                ref={categoryRef}
                id="report-category"
                disabled={
                  isBusy || categoriesLoading || categories.length === 0
                }
                required
                aria-invalid={categoryMissing}
                aria-describedby={
                  categoryMissing ? "report-category-error" : undefined
                }
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-10 w-full scroll-mt-24 rounded-lg border border-black/10 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-rose-500/70 dark:border-white/10"
              >
                <option value="" disabled>
                  {categoriesLoading
                    ? "Đang tải danh mục..."
                    : "Chọn thủ đoạn"}
                </option>
                {categories.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              {!categoriesLoading && categories.length === 0 && (
                <p
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                  role="alert"
                >
                  Không tải được danh mục hoạt động.{" "}
                  <button
                    type="button"
                    onClick={() => setCategoriesRevision((v) => v + 1)}
                    className="cursor-pointer font-semibold underline underline-offset-2"
                  >
                    Thử lại
                  </button>
                </p>
              )}
              {categoryMissing && (
                <p
                  id="report-category-error"
                  className="text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  Vui lòng chọn danh mục thủ đoạn.
                </p>
              )}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="report-description"
                className="text-xs font-semibold text-foreground"
              >
                Mô tả ngắn gọn hành vi{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                {description.length.toLocaleString("vi-VN")}/2.000 ký tự
              </span>
            </div>
            <textarea
              ref={descriptionRef}
              id="report-description"
              maxLength={2000}
              rows={4}
              required
              aria-invalid={descriptionMissing}
              aria-describedby={
                descriptionMissing ? "report-description-error" : undefined
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              placeholder="Mô tả chi tiết kịch bản, lời nói hoặc bằng chứng lừa đảo..."
              className="w-full resize-y scroll-mt-24 rounded-lg border border-black/10 bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-rose-500/70 dark:border-white/10"
            />
            {descriptionMissing && (
              <p
                id="report-description-error"
                className="text-xs font-medium text-rose-700 dark:text-rose-300"
              >
                Vui lòng mô tả ngắn gọn hành vi cần báo cáo.
              </p>
            )}
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
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-xs font-bold text-primary-foreground tabular-nums">
              3
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              Xác nhận & gửi
            </h3>
          </div>

          <div className="space-y-2 rounded-lg bg-muted/35 p-3.5 text-xs">
            <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck
                aria-hidden="true"
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <span>
                Báo cáo sẽ được kiểm duyệt độc lập trước khi cảnh báo cộng đồng.
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Medal
                aria-hidden="true"
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              <span>
                Báo cáo được xác thực giúp bạn nhận{" "}
                <strong className="font-semibold text-foreground">
                  50 điểm uy tín
                </strong>{" "}
                và nâng thứ hạng.
              </span>
            </div>
          </div>

          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
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
              className="size-4 rounded-md border-border accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <span>Tôi xác nhận thông tin cung cấp là trung thực.</span>
          </label>
          {confirmationMissing && (
            <p
              id="report-confirmation-error"
              className="text-xs font-medium text-rose-700 dark:text-rose-300"
            >
              Vui lòng xác nhận thông tin cung cấp là trung thực.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isBusy}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
                !isComplete && "opacity-75"
              )}
            >
              {isBusy ? (
                <>
                  <div className="motion-safe:animate-spin">
                    <CircleNotch aria-hidden="true" size={16} weight="bold" />
                  </div>
                  <span>Đang gửi báo cáo...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt aria-hidden="true" size={16} weight="fill" />
                  <span>Gửi báo cáo</span>
                </>
              )}
            </button>

            {isSuccess && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle aria-hidden="true" size={18} weight="fill" />
                <span>Gửi báo cáo thành công!</span>
              </span>
            )}
          </div>

          {isBusy && attachments.length > 0 && (
            <div
              role="status"
              className="space-y-1.5 text-xs text-muted-foreground tabular-nums"
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
                  className="h-full origin-left rounded-full bg-primary transition-transform duration-150"
                  style={{
                    transform: `scaleX(${Math.min(100, Math.max(0, uploadProgress)) / 100})`,
                  }}
                />
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-900 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200"
            >
              <ReportSubmissionError message={submitError} />
            </div>
          )}
        </div>
      </fieldset>
    </form>
  )
}
