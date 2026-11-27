"use client"

import { getReportTargetTypeWarning } from "@/features/report/utils/report-target"
import {
  formatReportPhoneInput,
  isCompleteReportPhone,
  limitReportPhoneInput,
} from "@/features/report/utils/report-phone"

import { Combobox } from "@base-ui/react/combobox"
import { dashboardService } from "@/features/dashboard/services/dashboard.service"
import type { DashboardRegionOption } from "@/features/dashboard/types/dashboard.types"
import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ReportSubmissionError } from "./report-submission-error"
import { ReportPrivacyNotice } from "./report-privacy-notice"
import { toast } from "react-toastify"
import type { ReactNode } from "react"
import {
  Phone,
  Globe,
  Bank,
  CaretDown,
  ShieldCheck,
  PaperPlaneTilt,
  Shield,
  CircleNotch,
  CheckCircle,
  Medal,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react"
import { ReportThreatTypeSelector } from "./report-threat-type-selector"
import { ReportFileUpload } from "./report-file-upload"
import { useReportAttachments } from "@/features/report/hooks/use-report-attachments"
import {
  ScamCategoryItem,
  ReportThreatType,
  CreateReportPayload,
} from "@/features/report/types/report.types"
import { getScamCheckResult } from "@/features/check/services/check.service"

/** Keep in sync with `REPORT_PREFILL_KEY` in the check action bar. */
const REPORT_PREFILL_KEY = "scamshield.report-prefill"

const INPUT_TYPE_TO_THREAT_TYPE: Record<string, ReportThreatType> = {
  URL: "WEBSITE",
  PHONE: "PHONE",
  BANK_ACCOUNT: "BANK_ACCOUNT",
}

/** Draft written by the check result action bar before navigating here. */
interface ReportPrefillDraft {
  scanId?: string | null
  checkId?: number | null
  inputType?: string | null
  targetIdentifier?: string | null
  reportedMessage?: string | null
  description?: string | null
}

/**
 * Reads the draft without consuming it, so the form can seed its fields during
 * the first render. `clearReportPrefill` drops it once the form has mounted.
 */
function peekReportPrefill(): ReportPrefillDraft | null {
  try {
    const raw = window.sessionStorage.getItem(REPORT_PREFILL_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as ReportPrefillDraft
  } catch {
    return null
  }
}

/** One-shot hand-off: never re-apply stale context on a later visit. */
function clearReportPrefill() {
  try {
    window.sessionStorage.removeItem(REPORT_PREFILL_KEY)
  } catch {
    // Private mode or a blocked storage API: there is nothing to clear.
  }
}

function threatTypeFromInputType(value: string | null | undefined) {
  if (!value) return null
  return INPUT_TYPE_TO_THREAT_TYPE[value] ?? null
}

function parseCheckId(value: string | number | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

function extractTrailingDigits(value: string) {
  const match = /(\d+)\s*$/.exec(value)
  return match ? match[1] : null
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim()
  return trimmed.length <= maxLength
    ? trimmed
    : `${trimmed.slice(0, maxLength - 3).trimEnd()}...`
}

import { getReportCategories } from "@/features/report/services/report.service"

const reportControlClass =
  "w-full scroll-mt-24 rounded-lg border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-hidden aria-invalid:border-destructive dark:bg-muted/20 sm:text-sm"
const reportInputClass = `${reportControlClass} min-h-11 py-2.5 pr-3 pl-10`
const reportSectionClass =
  "min-w-0 scroll-mt-24 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:space-y-5 sm:p-6"

function ReportSectionHeading({ number, id, children }: { number: number; id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 font-heading text-lg font-bold text-foreground sm:text-xl">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-200">
        {number}
      </span>
      {children}
    </h2>
  )
}

interface ReportFormProps {
  onSubmit: (payload: CreateReportPayload) => Promise<void>
  isLoading?: boolean
  uploadProgress?: number
}

export function ReportForm(props: ReportFormProps) {
  return (
    <Suspense
      fallback={
        <div className={reportSectionClass}>
          <p role="status" className="text-sm text-muted-foreground">
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
  const [description, setDescription] = useState("")
  const attachmentUpload = useReportAttachments()
  const { attachments, error: fileError } = attachmentUpload
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
  const submittingRef = useRef(false)
  const activeRef = useRef(true)
  const prefillConsumedRef = useRef(false)

  const isBusy = Boolean(isLoading || isSubmitting)
  const typeWarning =
    threatType === "PHONE" && targetIdentifier.trim() && !isCompleteReportPhone(targetIdentifier)
      ? "Nhập 10 chữ số bắt đầu bằng 0, hoặc +84 theo sau bởi 9 chữ số (bỏ số 0 đầu)."
      : getReportTargetTypeWarning(threatType, targetIdentifier)
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
    return () => {
      activeRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => setIsSuccess(false), 4000)
    return () => clearTimeout(timer)
  }, [isSuccess])

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
    if (attachmentUpload.editingId) {
      toast.info("Hãy xác nhận hoặc hủy phần chỉnh sửa ảnh đang mở.", { toastId: "report-evidence-editor-open" })
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
      attachmentUpload.clear()
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
      className="min-w-0"
    >
      <fieldset disabled={isBusy} className="min-w-0 space-y-4">
        <section id="report-target" tabIndex={-1} aria-labelledby="report-target-heading" ref={threatGroupRef} className={reportSectionClass}>
          <ReportSectionHeading number={1} id="report-target-heading">Đối tượng báo cáo</ReportSectionHeading>
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
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="report-target-identifier"
                className="block text-sm font-semibold text-foreground"
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
                inputMode={threatType === "PHONE" ? "tel" : undefined}
                required
                disabled={!threatType}
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
                onChange={(e) => {
                  const value = e.target.value
                  setTargetIdentifier((previous) =>
                    threatType === "PHONE" ? limitReportPhoneInput(value, previous) : value
                  )
                }}
                onBlur={() => setTargetTouched(true)}
                placeholder={
                  !threatType
                    ? "Chọn loại đối tượng báo cáo trước"
                    : threatType === "PHONE"
                      ? "VD: 0912 345 678 hoặc +84 912 345 678"
                      : threatType === "WEBSITE"
                        ? "Nhập URL website giả mạo..."
                        : "Nhập số tài khoản ngân hàng thụ hưởng..."
                }
                className={`${reportInputClass} disabled:cursor-not-allowed disabled:opacity-70`}
              />
            </div>
            {showTypeWarning && (
              <p
                id="report-target-type-warning"
                role="alert"
                className="text-xs text-destructive"
              >
                {showTypeWarning}
              </p>
            )}
            {targetMissing && (
              <p
                id="report-target-error"
                className="text-xs text-destructive"
              >
                Vui lòng nhập số điện thoại, URL hoặc tài khoản cần báo cáo.
              </p>
            )}
          </div>
        </section>

        <section id="report-evidence" tabIndex={-1} aria-labelledby="report-evidence-heading" className={reportSectionClass}>
          <ReportSectionHeading number={2} id="report-evidence-heading">Thông tin và minh chứng</ReportSectionHeading>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">

            {/* Province selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="report-region"
                className="block text-sm font-semibold text-foreground"
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
                    aria-describedby={hasAttemptedSubmit && !regionCode ? "report-region-error" : undefined}
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
                <p id="report-region-error" role="alert" className="text-sm text-destructive">
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
                className="block text-sm font-semibold text-foreground"
              >
                Danh mục thủ đoạn{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div className="relative">
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
                  className={`${reportControlClass} min-h-11 appearance-none py-2.5 pr-10 pl-3 forced-colors:appearance-auto forced-colors:pr-3`}
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
                <CaretDown
                  size={16}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[#45464D] dark:text-muted-foreground forced-colors:hidden"
                />
              </div>
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
                className="text-sm font-semibold text-foreground"
              >
                Mô tả ngắn gọn hành vi{" "}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {description.length}/2000 ký tự
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
              placeholder="Đối tượng đã tiếp cận bạn bằng cách nào và yêu cầu bạn làm gì?"
              className={`${reportControlClass} min-h-28 resize-y p-3 leading-relaxed`}
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
          <div ref={fileSectionRef} className="space-y-3 border-t border-border pt-4">
            <ReportFileUpload
              attachments={attachments}
              disabled={isBusy}
              error={
                fileError ||
                (hasAttemptedSubmit && attachments.length === 0
                  ? "Vui lòng đính kèm ít nhất một tệp minh chứng."
                  : null)
              }
              onAdd={fileList => {
                if (!submittingRef.current) attachmentUpload.add(fileList)
              }}
              onRemove={attachmentUpload.remove}
              onReview={attachmentUpload.markReviewed}
              editingId={attachmentUpload.editingId}
              onEdit={attachmentUpload.setEditingId}
            />
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="mb-1">
                <strong>Bảo vệ thông tin cá nhân.</strong>{" "}
                Nếu cần, bạn có thể che thông tin trên ảnh đính kèm. Với PDF, hãy che thông tin trước khi chọn tệp.
              </p>
              <ReportPrivacyNotice />
            </div>
          </div>
        </section>

        <section id="report-confirmation" tabIndex={-1} aria-labelledby="report-confirmation-heading" className={reportSectionClass}>
          <ReportSectionHeading number={3} id="report-confirmation-heading">Xác nhận và gửi</ReportSectionHeading>

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

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground has-[:checked]:border-primary/50">
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
              className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-3 py-3.5 text-red-950 dark:border-red-900 dark:border-l-red-400 dark:bg-red-950/40 dark:text-red-100 sm:px-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-200">
                <WarningCircle size={21} weight="fill" aria-hidden="true" />
              </span>
              <div className="min-w-0 text-sm leading-relaxed">
                <p className="font-bold">Không thể gửi báo cáo</p>
                <p className="mt-0.5 [overflow-wrap:anywhere]">
                  <ReportSubmissionError message={submitError} />
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4 sm:justify-end">
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:w-auto"
            >
              {isBusy ? (
                <>
                  <CircleNotch size={16} aria-hidden="true" className="motion-safe:animate-spin" />
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
        </section>
      </fieldset>
    </form>
  )
}
