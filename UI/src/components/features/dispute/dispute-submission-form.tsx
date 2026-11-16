"use client"

import React, { useEffect, useState, useRef } from "react"
import {
  Phone,
  Bank,
  Globe,
  Tag,
  UploadSimple,
  Trash,
  FilePdf,
  FileImage,
  FloppyDisk,
  PaperPlaneRight,
  CircleNotch,
  Info,
  CheckCircle,
} from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"
import {
  DisputeIndicatorType,
  DisputeLegalRelationship,
} from "@/features/dispute/types/dispute.types"
import {
  submitDispute,
  createDisputeDraft,
} from "@/features/dispute/services/dispute.service"

interface DisputeSubmissionFormProps {
  onSuccess?: () => void
}

const INDICATOR_TYPES: {
  type: DisputeIndicatorType
  label: string
  sublabel: string
  placeholder: string
  icon: React.ElementType
}[] = [
  {
    type: "PHONE",
    label: "Số điện thoại",
    sublabel: "Hotline, số di động chính chủ",
    placeholder: "Ví dụ: 0912348899 hoặc +84912348899",
    icon: Phone,
  },
  {
    type: "BANK_ACCOUNT",
    label: "Tài khoản ngân hàng",
    sublabel: "STK ngân hàng chính chủ",
    placeholder: "Ví dụ: 190362198888 hoặc STK Vietcombank",
    icon: Bank,
  },
  {
    type: "URL",
    label: "Website / Tên miền",
    sublabel: "Domain, website doanh nghiệp",
    placeholder: "Ví dụ: domain-chinhhang.vn hoặc https://tencongty.com",
    icon: Globe,
  },
  {
    type: "BRANDNAME",
    label: "SMS Brandname",
    sublabel: "Tên thương hiệu gửi tin SMS",
    placeholder: "Ví dụ: VIETINBANK, SHOPEE, LAZADA...",
    icon: Tag,
  },
]

const LEGAL_RELATIONSHIPS: {
  value: DisputeLegalRelationship
  title: string
  desc: string
}[] = [
  {
    value: "OWNER",
    title: "Chủ sở hữu hợp pháp",
    desc: "Cá nhân hoặc tổ chức trực tiếp sở hữu chỉ số (tên trên hợp đồng / đăng ký).",
  },
  {
    value: "LEGAL_REPRESENTATIVE",
    title: "Người đại diện theo pháp luật",
    desc: "Giám đốc, Tổng giám đốc hoặc người đại diện đứng tên trên GPKD.",
  },
  {
    value: "AUTHORIZED_REPRESENTATIVE",
    title: "Đại diện theo ủy quyền",
    desc: "Được chủ sở hữu ủy quyền bằng văn bản hoặc giấy ủy quyền hợp lệ.",
  },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 10
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]

/** Keep in sync with `DISPUTE_PREFILL_KEY` in the check action bar. */
const DISPUTE_PREFILL_KEY = "scamshield.dispute-prefill"

/** Only an indicator can be disputed, so free-form text maps to nothing. */
const INPUT_TYPE_TO_INDICATOR: Record<string, DisputeIndicatorType> = {
  URL: "URL",
  PHONE: "PHONE",
  BANK_ACCOUNT: "BANK_ACCOUNT",
}

/** Draft written by the check result action bar before navigating here. */
interface DisputePrefillDraft {
  scanId?: string | null
  checkId?: number | null
  inputType?: string | null
  indicatorValue?: string | null
}

/**
 * Reads the draft without consuming it, so the form can seed its fields during
 * the first render. `clearDisputePrefill` drops it once the form has mounted.
 */
function peekDisputePrefill(): DisputePrefillDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DISPUTE_PREFILL_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as DisputePrefillDraft
  } catch {
    return null
  }
}

/** One-shot hand-off: never re-apply stale context on a later visit. */
function clearDisputePrefill() {
  try {
    window.sessionStorage.removeItem(DISPUTE_PREFILL_KEY)
  } catch {
    // Private mode or a blocked storage API: there is nothing to clear.
  }
}

function indicatorTypeFromInputType(value: string | null | undefined) {
  if (!value) return null
  return INPUT_TYPE_TO_INDICATOR[value] ?? null
}

export function DisputeSubmissionForm({ onSuccess }: DisputeSubmissionFormProps) {
  // The check action bar hands a one-shot draft over in `sessionStorage`. It is
  // read during the first render - never inside an effect - so the fields are
  // seeded without cascading re-renders.
  const [prefillDraft] = useState(() => peekDisputePrefill())
  const [indicatorType, setIndicatorType] = useState<DisputeIndicatorType>(
    () => indicatorTypeFromInputType(prefillDraft?.inputType) ?? "PHONE"
  )
  // Only the disputed target is carried over. The reason box stays empty on
  // purpose: it is the user's own legal declaration, not a summary of the
  // automated verdict.
  const [indicatorValue, setIndicatorValue] = useState(
    () => prefillDraft?.indicatorValue?.trim() ?? ""
  )
  const [legalRelationship, setLegalRelationship] =
    useState<DisputeLegalRelationship>("OWNER")
  const [reason, setReason] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // The draft was already rendered into the fields above; drop it now so a
  // later visit starts clean.
  useEffect(() => {
    if (prefillDraft) clearDisputePrefill()
    // `prefillDraft` never changes after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeIndicatorConfig =
    INDICATOR_TYPES.find((t) => t.type === indicatorType) || INDICATOR_TYPES[0]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incomingFiles = Array.from(e.target.files)

    // Check quantity limit
    if (files.length + incomingFiles.length > MAX_FILES) {
      toast.error(`Mỗi hồ sơ chỉ được đính kèm tối đa ${MAX_FILES} tài liệu.`)
      return
    }

    const validNewFiles: File[] = []
    for (const file of incomingFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Tệp "${file.name}" vượt quá dung lượng tối đa 5MB.`)
        continue
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(
          `Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận định dạng PDF, JPG, PNG.`
        )
        continue
      }
      validNewFiles.push(file)
    }

    setFiles((prev) => [...prev, ...validNewFiles])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Handle Save Draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      await createDisputeDraft(
        {
          indicatorType,
          indicatorValue: indicatorValue.trim() || undefined,
          legalRelationship,
          reason: reason.trim() || undefined,
        },
        files
      )
      toast.success("Đã lưu bản nháp thành công! Bạn có thể xem và nộp sau.")
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu bản nháp. Vui lòng thử lại!"
      toast.error(message)
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Handle Submit Formal Dispute
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!indicatorValue.trim()) {
      toast.warning("Vui lòng nhập chỉ số cần khiếu nại giải tỏa.")
      return
    }

    if (reason.trim().length < 10) {
      toast.warning("Lý do khiếu nại và giải trình phải có tối thiểu 10 ký tự.")
      return
    }

    if (files.length === 0) {
      toast.warning(
        "Vui lòng tải lên ít nhất một tài liệu chứng minh chính chủ (PDF/Ảnh)."
      )
      return
    }

    if (!agreeTerms) {
      toast.warning(
        "Bạn cần đồng ý với điều khoản cam kết trước khi gửi hồ sơ khiếu nại."
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitDispute(
        {
          indicatorType,
          indicatorValue: indicatorValue.trim(),
          legalRelationship,
          reason: reason.trim(),
          agreeTerms: true,
        },
        files
      )

      toast.success(
        `Hồ sơ khiếu nại ${res.disputeCode || ""} đã được gửi thành công và đang chờ thẩm định!`
      )

      // Reset form
      setIndicatorValue("")
      setReason("")
      setFiles([])
      setAgreeTerms(false)

      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể gửi hồ sơ khiếu nại. Vui lòng thử lại!"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmitDispute}
      className="space-y-8 bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      {/* Intro alert */}
      <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-4 flex items-start gap-3">
        <Info weight="fill" className="text-blue-600 dark:text-blue-400 text-xl shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="font-bold text-slate-900 dark:text-white mb-0.5">
            Lưu ý về quy trình thụ lý & xác minh độc lập:
          </p>
          Hệ thống chỉ tiếp nhận khiếu nại cho các chỉ số đang bị cảnh báo trong hệ thống Blacklist của ScamShield. Hồ sơ sẽ được Hội đồng chuyên gia thẩm định đối soát với cơ quan chức năng (A05/NCSC, Cục Viễn thông, Ngân hàng) trong tối đa 48 giờ.
        </div>
      </div>

      {/* STEP 1: Loại chỉ số */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
            1
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Chọn Loại Chỉ Số Cần Khiếu Nại
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {INDICATOR_TYPES.map((item) => {
            const Icon = item.icon
            const isSelected = indicatorType === item.type
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setIndicatorType(item.type)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border text-left transition-all relative overflow-hidden",
                  isSelected
                    ? "border-blue-600 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-600 dark:ring-blue-400"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                    isSelected
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Icon weight="bold" className="text-lg" />
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {item.sublabel}
                </div>
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 text-blue-600 dark:text-blue-400">
                    <CheckCircle weight="fill" className="text-base" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 2: Giá trị chỉ số & Quan hệ pháp lý */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
            2
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Thông Tin Chỉ Số & Quan Hệ Pháp Lý
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Indicator Value Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Giá trị {activeIndicatorConfig.label}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={indicatorValue}
                onChange={(e) => setIndicatorValue(e.target.value)}
                placeholder={activeIndicatorConfig.placeholder}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Backend sẽ đối chiếu giá trị này với cơ sở dữ liệu Blacklist đang hiệu lực.
            </p>
          </div>

          {/* Legal Relationship Select */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tư cách pháp lý của bạn với chỉ số{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {LEGAL_RELATIONSHIPS.map((rel) => (
                <label
                  key={rel.value}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                    legalRelationship === rel.value
                      ? "border-blue-500 bg-blue-50/40 dark:border-blue-400 dark:bg-blue-950/20"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <input
                    type="radio"
                    name="legalRelationship"
                    value={rel.value}
                    checked={legalRelationship === rel.value}
                    onChange={() => setLegalRelationship(rel.value)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {rel.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {rel.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Lý do khiếu nại & Giải trình */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
            3
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Nội Dung Giải Trình & Lý Do Khiếu Nại
          </h3>
        </div>

        <div className="space-y-1.5">
          <textarea
            required
            rows={4}
            maxLength={10000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mô tả chi tiết nguyên nhân chỉ số bị nhầm lẫn, hoàn cảnh phát sinh (ví dụ: bị đối tượng xấu mạo danh, hotline CSKH chính thống, giấy phép cung cấp dịch vụ viễn thông...)"
            className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>Tối thiểu 10 ký tự, tối đa 10.000 ký tự</span>
            <span>{reason.length}/10.000 ký tự</span>
          </div>
        </div>
      </div>

      {/* STEP 4: Bằng chứng & Tài liệu đính kèm */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
              4
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tài Liệu Chứng Minh Chính Chủ
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Đã chọn: <strong className="text-slate-900 dark:text-white">{files.length}</strong>/{MAX_FILES} tệp
          </span>
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <UploadSimple weight="bold" className="text-2xl" />
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
            Nhấn để chọn tệp hoặc kéo thả tài liệu vào đây
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Hỗ trợ định dạng <strong>PDF, JPG, PNG</strong>. Dung lượng tối đa <strong>5MB</strong> mỗi tệp (tối đa 10 tệp).
          </p>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Danh sách tài liệu đã đính kèm:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {files.map((file, idx) => {
                const isPdf = file.type === "application/pdf"
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-200">
                        {isPdf ? (
                          <FilePdf weight="fill" className="text-red-500 text-lg" />
                        ) : (
                          <FileImage weight="fill" className="text-blue-500 text-lg" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                      title="Xóa tệp này"
                    >
                      <Trash weight="bold" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* STEP 5: Cam kết pháp lý */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
            <strong className="text-slate-900 dark:text-white">
              Cam kết trách nhiệm pháp lý:
            </strong>{" "}
            Tôi cam kết rằng toàn bộ thông tin kê khai và các tài liệu, con dấu, chữ ký số cung cấp trong hồ sơ này là hoàn toàn trung thực, chính xác và chịu mọi trách nhiệm trước pháp luật về tính pháp lý của hồ sơ khiếu nại.
          </div>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          disabled={isSavingDraft || isSubmitting}
          onClick={handleSaveDraft}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
        >
          {isSavingDraft ? (
            <CircleNotch className="animate-spin text-base" />
          ) : (
            <FloppyDisk weight="bold" className="text-base" />
          )}
          <span>Lưu Bản Nháp</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting || isSavingDraft}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <CircleNotch className="animate-spin text-base" />
          ) : (
            <PaperPlaneRight weight="bold" className="text-base" />
          )}
          <span>Nộp Đơn Khiếu Nại & Phản Chứng</span>
        </button>
      </div>
    </form>
  )
}
