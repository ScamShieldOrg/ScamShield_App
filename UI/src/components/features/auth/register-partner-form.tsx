"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Buildings,
  IdentificationCard,
  EnvelopeSimple,
  User,
  Phone,
  Globe,
  Headset,
  ChatCircleText,
  FileArrowUp,
  ShieldCheck,
  ShieldWarning,
  ChartLineUp,
  Scales,
  ClockCountdown,
  Info,
  PaperPlaneTilt,
  CheckCircle,
  FileText,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import { getRecaptchaToken } from "@/lib/firebase/recaptcha"
import { OtpVerificationPopup } from "@/components/shared/otp-verification"
import {
  AuthInput,
  AuthCheckbox,
  PrivilegePill,
  SocialProofBanner,
} from "@/components/features/auth/auth-shared-components"
import {
  authServices,
  RegisterPartnerPayload,
} from "@/features/auth/services/auth-services"

const RECAPTCHA_CONTAINER_ID = "register-partner-recaptcha"
const FORM_STORAGE_KEY = "scamshield_partner_register_form"
const COOLDOWN_STORAGE_KEY = "scamshield_partner_otp_cooldown_until"
const OTP_OPEN_STORAGE_KEY = "scamshield_partner_otp_open"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TAX_CODE_REGEX = /^[0-9]{10}(-?[0-9]{3})?$/
const MOBILE_PHONE_REGEX =
  /^[\s().-]*(?:0|\+[\s().-]*8[\s().-]*4)[\s().-]*[35789](?:[\s().-]*[0-9]){8}[\s().-]*$/
const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const SMS_BRAND_REGEX = /^[A-Z0-9][A-Z0-9 _-]*$/
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TOTAL_SIZE = 75 * 1024 * 1024
const MAX_FILES = 10
const SUPPORTED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
}
interface PartnerFormState {
  companyName: string
  taxCode: string
  businessEmail: string
  representativeName: string
  contactPhone: string
  officialDomains: string
  officialHotline: string
  smsBrandname: string
  agreeCommitment: boolean
  verificationToken: string
  legalRepresentative: boolean | null
}

interface PartnerFormErrors {
  companyName?: string
  taxCode?: string
  businessEmail?: string
  representativeName?: string
  contactPhone?: string
  officialDomains?: string
  officialHotline?: string
  smsBrandname?: string
  businessLicenseFiles?: string
  ownershipProofFiles?: string
  authorizationFiles?: string
  agreeCommitment?: string
  legalRepresentative?: string
}

export interface PartnerRegistrationFiles {
  businessLicenseFiles: File[]
  ownershipProofFiles: File[]
  authorizationFiles: File[]
}

interface FileUploadBoxProps {
  id: string
  label: string
  required?: boolean
  description: string
  accept?: string
  files: File[]
  onFilesSelect: (selected: FileList | null) => void
  onRemoveFile: (index: number) => void
  error?: string
}

function FileUploadBox({
  id,
  label,
  required,
  description,
  accept = ".pdf,.jpg,.jpeg,.png",
  files,
  onFilesSelect,
  onRemoveFile,
  error,
}: FileUploadBoxProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className="rounded-xl border border-[#D8DEFF] bg-white p-4 shadow-2xs dark:border-border dark:bg-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-bold text-[#131B2E] dark:text-foreground"
        >
          {label} {required && <span className="text-[#BA1A1A]">*</span>}
        </label>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            required
              ? "bg-[#EAEDFF] text-[#131A33] dark:bg-primary/20 dark:text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {required ? "Bắt buộc" : "Tùy chọn"}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          onFilesSelect(e.dataTransfer.files)
        }}
        className={cn(
          "rounded-lg border-2 border-dashed text-center transition-all focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-[#C6C6CE] bg-[#F9FAFF] hover:border-[#131A33] hover:bg-[#F2F4FF] dark:border-border dark:bg-muted/30 dark:hover:border-primary dark:hover:bg-muted/50",
          error && "border-[#BA1A1A] bg-red-50/20"
        )}
      >
        <input
          type="file"
          id={id}
          multiple
          accept={accept}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
          onChange={(e) => {
            onFilesSelect(e.target.files)
            e.target.value = ""
          }}
          className="sr-only"
        />
        <label htmlFor={id} className="block cursor-pointer p-4">
          <span className="mx-auto mb-1.5 flex size-9 items-center justify-center rounded-full bg-[#EAEDFF] text-[#131A33] dark:bg-muted dark:text-foreground">
            <FileArrowUp size={18} weight="regular" />
          </span>
          <span className="block text-xs font-semibold text-[#131B2E] dark:text-foreground">
            Kéo thả tệp vào đây hoặc{" "}
            <span className="text-[#545D7C] underline underline-offset-2 dark:text-primary">
              chọn từ thiết bị
            </span>
          </span>
          <span
            id={`${id}-description`}
            className="mt-0.5 block text-[11px] text-[#76767E] dark:text-muted-foreground"
          >
            {description}
          </span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between rounded-md border border-[#D1DEFF] bg-[#F8FAFF] px-2.5 py-1.5 text-xs dark:border-border dark:bg-muted/40"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={15} className="shrink-0 text-primary" />
                <span className="truncate font-medium text-[#131B2E] dark:text-foreground">
                  {file.name}
                </span>
                <span className="shrink-0 text-[11px] text-[#76767E]">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveFile(idx)
                }}
                className="text-[#BA1A1A] transition-colors hover:opacity-80"
                aria-label={`Xóa tệp ${file.name}`}
              >
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs text-[#BA1A1A] dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export function RegisterPartnerForm() {
  const [businessLicenseFiles, setBusinessLicenseFiles] = useState<File[]>([])
  const [ownershipProofFiles, setOwnershipProofFiles] = useState<File[]>([])
  const [authorizationFiles, setAuthorizationFiles] = useState<File[]>([])
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false)
  const [isOtpOpen, setIsOtpOpen] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState("")
  const [isGettingRecaptcha, setIsGettingRecaptcha] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const [form, setForm] = useState<PartnerFormState>({
    companyName: "",
    taxCode: "",
    businessEmail: "",
    representativeName: "",
    contactPhone: "",
    officialDomains: "",
    officialHotline: "",
    smsBrandname: "",
    agreeCommitment: false,
    verificationToken: "",
    legalRepresentative: null,
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<PartnerFormErrors>({})

  // Khôi phục dữ liệu form, cooldown và trạng thái pop-up OTP khi chuyển trang hoặc tải lại trang
  useEffect(() => {
    // 1. Khôi phục thông tin form đã điền
    try {
      const savedForm = sessionStorage.getItem(FORM_STORAGE_KEY)
      if (savedForm) {
        const parsed = JSON.parse(savedForm)
        setForm((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore
    }

    // 2. Khôi phục cooldown 60s
    let remaining = 0
    try {
      const savedExpire = localStorage.getItem(COOLDOWN_STORAGE_KEY)
      if (savedExpire) {
        remaining = Math.ceil((parseInt(savedExpire, 10) - Date.now()) / 1000)
        if (remaining > 0) {
          setCooldown(remaining)
        } else {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY)
        }
      }
    } catch {
      // ignore
    }

    // 3. Khôi phục pop-up OTP nếu cooldown còn hiệu lực và pop-up đang mở trước đó
    try {
      if (
        remaining > 0 &&
        sessionStorage.getItem(OTP_OPEN_STORAGE_KEY) === "true"
      ) {
        setIsOtpOpen(true)
      }
    } catch {
      // ignore
    }
  }, [])

  // Lưu thông tin form vào sessionStorage để không bị mất dữ liệu khi rời trang
  useEffect(() => {
    try {
      const { verificationToken, ...saveable } = form
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(saveable))
    } catch {
      // ignore
    }
  }, [form])

  // Lưu trạng thái pop-up OTP vào sessionStorage
  useEffect(() => {
    try {
      if (isOtpOpen) {
        sessionStorage.setItem(OTP_OPEN_STORAGE_KEY, "true")
      } else {
        sessionStorage.removeItem(OTP_OPEN_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }, [isOtpOpen])

  useEffect(() => {
    if (cooldown <= 0) {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY)
      return
    }
    const timer = setTimeout(() => {
      try {
        const savedExpire = localStorage.getItem(COOLDOWN_STORAGE_KEY)
        if (savedExpire) {
          const remaining = Math.ceil(
            (parseInt(savedExpire, 10) - Date.now()) / 1000
          )
          setCooldown(remaining > 0 ? remaining : 0)
        } else {
          setCooldown((s) => s - 1)
        }
      } catch {
        setCooldown((s) => s - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function validateField(
    name: keyof PartnerFormState,
    value: unknown
  ): string | undefined {
    switch (name) {
      case "companyName": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập tên doanh nghiệp hoặc ngân hàng."
        if (val.length < 3) return "Tên doanh nghiệp phải có ít nhất 3 ký tự."
        if (val.length > 255) return "Tên doanh nghiệp tối đa 255 ký tự."
        return undefined
      }
      case "taxCode": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập mã số thuế / mã số doanh nghiệp."
        if (!TAX_CODE_REGEX.test(val))
          return "Mã số thuế gồm 10 hoặc 13 chữ số, có thể có dấu gạch nối trước 3 số cuối."
        return undefined
      }
      case "businessEmail": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập email liên hệ."
        if (!EMAIL_REGEX.test(val)) return "Địa chỉ email không đúng định dạng."
        if (val.length > 254) return "Email tối đa 254 ký tự."
        return undefined
      }
      case "representativeName": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập họ tên & chức vụ người đại diện."
        if (val.length > 255)
          return "Thông tin người đại diện tối đa 255 ký tự."
        return undefined
      }
      case "contactPhone": {
        const val = String(value).trim()
        if (!MOBILE_PHONE_REGEX.test(val) || val.length > 30)
          return "Số điện thoại phải là số di động Việt Nam hợp lệ, ví dụ 0912345678 hoặc +84912345678."
        return undefined
      }
      case "officialDomains": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập tên miền chính thống."
        let domain = ""
        try {
          if (!/^[^\s/:?#@]+$/.test(val)) throw new Error("Invalid hostname")
          domain = new URL(`http://${val}`).hostname.toLowerCase()
        } catch {
          return "Tên miền không đúng định dạng; chỉ nhập hostname, không nhập URL."
        }
        if (domain.length > 253 || !DOMAIN_REGEX.test(domain))
          return "Tên miền không đúng định dạng; ví dụ: example.com.vn."
        return undefined
      }
      case "officialHotline": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập hotline hoặc đầu số tổng đài."
        if (val.length > 30) return "Hotline tối đa 30 ký tự."
        const phone = val.replace(/[\s().-]/g, "")
        if (!/^\+?[0-9]{6,15}$/.test(phone))
          return "Hotline phải gồm 6 đến 15 chữ số; chỉ dùng thêm dấu + ở đầu."
        return undefined
      }
      case "smsBrandname": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập tên định danh SMS Brandname."
        if (val.length > 100 || !SMS_BRAND_REGEX.test(val.toUpperCase()))
          return "SMS Brandname tối đa 100 ký tự và chỉ gồm chữ Latin, số, khoảng trắng, dấu - hoặc _."
        return undefined
      }
      case "agreeCommitment": {
        if (!value)
          return "Vui lòng xác nhận cam kết tính chính xác của thông tin."
        return undefined
      }
      case "legalRepresentative": {
        if (value === null)
          return "Vui lòng xác định bạn có phải đại diện pháp luật không."
        return undefined
      }
      default:
        return undefined
    }
  }

  function handleBlur(field: keyof PartnerFormState) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, form[field]),
    }))
  }

  function handleChange<K extends keyof PartnerFormState>(
    field: K,
    value: PartnerFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }))
    }
  }

  function handleFilesSelect(
    field:
      "businessLicenseFiles" | "ownershipProofFiles" | "authorizationFiles",
    selected: FileList | null
  ) {
    if (!selected || selected.length === 0) return
    const newFiles = Array.from(selected)
    const allFiles = [
      ...businessLicenseFiles,
      ...ownershipProofFiles,
      ...authorizationFiles,
      ...newFiles,
    ]
    const invalidFile = newFiles.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
      return (
        !file.size ||
        file.size > MAX_FILE_SIZE ||
        SUPPORTED_FILE_TYPES[extension] !== file.type ||
        (field === "businessLicenseFiles" && file.type !== "application/pdf")
      )
    })
    const error = invalidFile
      ? field === "businessLicenseFiles"
        ? `Tệp ${invalidFile.name} phải là PDF và không vượt quá 25MB.`
        : `Tệp ${invalidFile.name} phải là PDF, JPG hoặc PNG và không vượt quá 25MB.`
      : allFiles.length > MAX_FILES
        ? "Tối đa 10 tệp cho một hồ sơ."
        : allFiles.reduce((total, file) => total + file.size, 0) >
            MAX_TOTAL_SIZE
          ? "Tổng dung lượng tài liệu không vượt quá 75MB."
          : undefined
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }))
      return
    }
    if (field === "businessLicenseFiles") {
      setBusinessLicenseFiles((prev) => [...prev, ...newFiles])
    } else if (field === "ownershipProofFiles") {
      setOwnershipProofFiles((prev) => [...prev, ...newFiles])
    } else if (field === "authorizationFiles") {
      setAuthorizationFiles((prev) => [...prev, ...newFiles])
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleRemoveFile(
    field:
      "businessLicenseFiles" | "ownershipProofFiles" | "authorizationFiles",
    index: number
  ) {
    if (field === "businessLicenseFiles") {
      setBusinessLicenseFiles((prev) => prev.filter((_, i) => i !== index))
    } else if (field === "ownershipProofFiles") {
      setOwnershipProofFiles((prev) => prev.filter((_, i) => i !== index))
    } else if (field === "authorizationFiles") {
      setAuthorizationFiles((prev) => prev.filter((_, i) => i !== index))
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isGettingRecaptcha || isSubmittedSuccess) return

    const newErrors: PartnerFormErrors = {
      companyName: validateField("companyName", form.companyName),
      taxCode: validateField("taxCode", form.taxCode),
      businessEmail: validateField("businessEmail", form.businessEmail),
      representativeName: validateField(
        "representativeName",
        form.representativeName
      ),
      contactPhone: validateField("contactPhone", form.contactPhone),
      officialDomains: validateField("officialDomains", form.officialDomains),
      officialHotline: validateField("officialHotline", form.officialHotline),
      smsBrandname: validateField("smsBrandname", form.smsBrandname),
      agreeCommitment: validateField("agreeCommitment", form.agreeCommitment),
      legalRepresentative: validateField(
        "legalRepresentative",
        form.legalRepresentative
      ),
      businessLicenseFiles:
        businessLicenseFiles.length === 0
          ? "Vui lòng tải lên giấy phép ĐKKD / giấy phép hoạt động."
          : undefined,
      ownershipProofFiles:
        ownershipProofFiles.length === 0
          ? "Vui lòng tải lên tài liệu chứng minh quyền sở hữu (domain / hotline / SMS Brandname)."
          : undefined,
      authorizationFiles:
        form.legalRepresentative === false && authorizationFiles.length === 0
          ? "Vui lòng tải lên giấy ủy quyền của tổ chức."
          : undefined,
    }

    setTouched({
      companyName: true,
      taxCode: true,
      businessEmail: true,
      representativeName: true,
      contactPhone: true,
      officialDomains: true,
      officialHotline: true,
      smsBrandname: true,
      agreeCommitment: true,
      legalRepresentative: true,
    })

    setErrors(newErrors)
    const hasError = Object.values(newErrors).some(Boolean)
    if (hasError || cooldown > 0) return

    // Gọi getRecaptchaToken từ lib/firebase/recaptcha
    setIsGettingRecaptcha(true)
    setOtpError(null)
    try {
      const token = await getRecaptchaToken(RECAPTCHA_CONTAINER_ID)
      setRecaptchaToken(token)
      // Gửi OTP qua SMS tới SĐT liên hệ
      await authServices.sendPhoneOtp(form.contactPhone, token)
      const expireAt = Date.now() + 60 * 1000
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(expireAt))
      sessionStorage.setItem(OTP_OPEN_STORAGE_KEY, "true")
      setCooldown(60)
      // Mở OTP verification pop-up
      setIsOtpOpen(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xác thực reCAPTCHA thất bại."
      toast.error(message)
    } finally {
      setIsGettingRecaptcha(false)
    }
  }

  async function handleOtpVerify(otp: string) {
    setIsSubmitting(true)
    setOtpError(null)

    // Bước 1: Xác thực OTP điện thoại để lấy verificationToken
    let verificationToken = form.verificationToken
    try {
      const response = await authServices.verifyContacts(form.contactPhone, otp)
      verificationToken = response.verificationToken
      setForm((prev) => ({ ...prev, verificationToken }))
    } catch (otpErr) {
      const message =
        otpErr instanceof Error
          ? otpErr.message
          : "Mã xác thực OTP không chính xác hoặc đã hết hạn."
      setOtpError(message)
      setIsSubmitting(false)
      return
    }

    // Bước 2 & 3: Chuẩn bị dữ liệu và gửi hồ sơ đăng ký đối tác (/api/partners/registrations)
    try {
      const partnerPayload: RegisterPartnerPayload = {
        legalName: form.companyName.trim(),
        officialDomains: form.officialDomains.trim(),
        representativeNameAndTitle: form.representativeName.trim(),
        contactPhone: form.contactPhone.trim(),
        legalRepresentative: form.legalRepresentative as boolean,
        corporateEmail: form.businessEmail.trim(),
        taxCode: form.taxCode.trim(),
        smsBrandNames: form.smsBrandname.trim(),
        agreeTerms: form.agreeCommitment,
        officialHotlines: form.officialHotline.trim(),
        verificationToken,
      }

      const result = await authServices.registerPartner(partnerPayload, {
        businessLicenseFiles,
        ownershipProofFiles,
        authorizationFiles,
      })

      toast.success(
        result?.message || "Hồ sơ đối tác đã được gửi và đang chờ xét duyệt!"
      )
      try {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY)
        sessionStorage.removeItem(OTP_OPEN_STORAGE_KEY)
        sessionStorage.removeItem(FORM_STORAGE_KEY)
      } catch {
        // ignore
      }
      setIsOtpOpen(false)
      setIsSubmittedSuccess(true)
      setCooldown(0)
    } catch (partnerErr) {
      const message =
        partnerErr instanceof Error
          ? partnerErr.message
          : "Gửi hồ sơ đăng ký đối tác thất bại."
      toast.error(`Lỗi nộp hồ sơ đối tác: ${message}`)
      // Đóng pop-up OTP để người dùng quay lại chỉnh sửa thông tin hồ sơ
      setIsOtpOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
      {/* ─── Left Column: Enterprise Partner Privileges Card ─── */}
      <div
        className={cn(
          "relative flex flex-col justify-between overflow-hidden rounded-2xl p-8 sm:p-10 lg:col-span-5",
          "shadow-xl"
        )}
        style={{
          background:
            "linear-gradient(96deg, #131A33 0%, #283044 50%, #000000 100%)",
        }}
      >
        {/* Ambient Glow Orbs */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full opacity-60"
          style={{
            background: "rgba(208, 217, 253, 0.12)",
            filter: "blur(32px)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 size-56 rounded-full opacity-50"
          style={{
            background: "rgba(201, 230, 255, 0.1)",
            filter: "blur(24px)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Sentinel Enterprise Rank Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wider text-[#DBE1FF] uppercase backdrop-blur-md">
              <ShieldCheck size={15} weight="fill" className="text-[#DBE1FF]" />
              <span>ĐỐI TÁC AN NINH SỐ: SENTINEL ENTERPRISE</span>
            </div>
          </div>

          {/* Hero Title & Subtitle */}
          <div className="space-y-2">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white lg:text-[34px]">
              Bảo vệ thương hiệu & danh tiếng số
            </h2>
            <p className="text-sm leading-relaxed text-[#DAE2FD]/80">
              Đồng hành cùng ScamShield, Trung tâm NCSC & Cục An ninh mạng A05
              bảo vệ khách hàng khỏi nạn lừa đảo giả mạo.
            </p>
          </div>

          {/* Key Privileges Checklist (Enterprise) */}
          <div className="mt-2 flex flex-col gap-3">
            <PrivilegePill
              icon={<ShieldWarning size={20} weight="fill" />}
              title="Bảo vệ thương hiệu trước vấn nạn giả mạo"
              description="Ngăn chặn kịp thời các chiến dịch phishing, SMS Brandname lậu và website lừa đảo mạo danh."
            />
            <PrivilegePill
              icon={<Globe size={20} weight="fill" />}
              title="Cập nhật Whitelist hệ thống toàn quốc"
              description="Đồng bộ hotline, domain và brandname chính chủ tới người dân, nhà mạng và các tổ chức tín dụng."
            />
            <PrivilegePill
              icon={<ChartLineUp size={20} weight="fill" />}
              title="Dashboard giám sát mạo danh Real-time"
              description="Truy cập bảng điều khiển cảnh báo sớm các vector tấn công giả mạo tổ chức theo thời gian thực."
            />
            <PrivilegePill
              icon={<Scales size={20} weight="fill" />}
              title="Hỗ trợ can thiệp pháp lý ưu tiên"
              description="Cơ chế phối hợp xử lý và triệt phá nhanh từ các cơ quan điều tra chuyên trách."
            />
          </div>
        </div>

        {/* Social Proof Footer Banner */}
        <SocialProofBanner
          avatars={[
            { text: "VCB", bg: "#EAEDFF", color: "#131B2E" },
            { text: "BIDV", bg: "#D0D9FD", color: "#555E7D" },
            { text: "TCB", bg: "#C9E6FF", color: "#001E2F" },
          ]}
          badgeText="+520"
          title="520+ Ngân hàng & Tổ chức đã tham gia"
          subtitle="Hệ thống phòng vệ số liên kết chính thức"
        />
      </div>

      {/* ─── Right Column: Enterprise Partner KYB & Whitelist Form ─── */}
      <div className="flex flex-col rounded-2xl border border-[#E2E7FF] bg-white p-6 shadow-sm sm:p-10 lg:col-span-7 dark:border-border dark:bg-card">
        <div className="mx-auto w-full">
          {/* Form Header */}
          <div className="mb-6">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
              Đăng Ký Đối Tác Doanh Nghiệp
            </h1>
            <p className="mt-1 text-sm text-[#45464D] dark:text-muted-foreground">
              Bảo vệ thương hiệu, số tổng đài và tên miền chính thống.
            </p>
          </div>

          {/* Registration completion */}
          {isSubmittedSuccess && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle
                size={24}
                weight="fill"
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div className="text-sm">
                <p className="font-semibold">
                  Đã gửi hồ sơ đối tác thành công!
                </p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  Hồ sơ và thông tin Whitelist của doanh nghiệp đã được tiếp
                  nhận. Đội ngũ đối soát sẽ phản hồi trong 24 - 48h làm việc.
                </p>
                <Link
                  href="/guest"
                  className="mt-3 inline-block font-semibold underline underline-offset-2"
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          )}

          {!isSubmittedSuccess && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* ── SECTION 1: Legal Enterprise Info (KYB) ── */}
              <div className="rounded-xl border border-[#EAEDFF] bg-[#F2F3FF]/70 p-4 sm:p-5 dark:border-border dark:bg-muted/40">
                <div className="mb-4 flex items-center gap-2 border-b border-[#EAEDFF] pb-3 dark:border-border">
                  <Buildings
                    size={18}
                    weight="bold"
                    className="text-[#131A33] dark:text-foreground"
                  />
                  <h3 className="text-sm font-bold text-[#131B2E] dark:text-foreground">
                    1. Thông tin pháp lý Doanh nghiệp (KYB)
                  </h3>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Tên doanh nghiệp */}
                  <AuthInput
                    label="Tên doanh nghiệp / Ngân hàng"
                    required
                    icon={<Buildings size={18} weight="regular" />}
                    placeholder="Ví dụ: Ngân hàng TMCP Ngoại thương Việt Nam"
                    value={form.companyName}
                    onChange={(e) =>
                      handleChange("companyName", e.target.value)
                    }
                    onBlur={() => handleBlur("companyName")}
                    error={errors.companyName}
                  />

                  {/* Mã số thuế & Email doanh nghiệp */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AuthInput
                      label="Mã số thuế / Mã số DN"
                      required
                      icon={<IdentificationCard size={18} weight="regular" />}
                      placeholder="Ví dụ: 0100112437"
                      value={form.taxCode}
                      onChange={(e) => handleChange("taxCode", e.target.value)}
                      onBlur={() => handleBlur("taxCode")}
                      error={errors.taxCode}
                    />

                    <AuthInput
                      label="Email liên hệ"
                      required
                      type="email"
                      icon={<EnvelopeSimple size={18} weight="regular" />}
                      placeholder="Ví dụ: partner@gmail.com"
                      value={form.businessEmail}
                      onChange={(e) =>
                        handleChange("businessEmail", e.target.value)
                      }
                      onBlur={() => handleBlur("businessEmail")}
                      error={errors.businessEmail}
                    />
                  </div>

                  {/* Chú thích email */}
                  <div className="flex items-center gap-2 rounded-lg bg-[#D0D9FD]/30 px-3 py-2 text-xs text-[#545D7C] dark:bg-muted/60 dark:text-muted-foreground">
                    <Info size={15} weight="bold" className="shrink-0" />
                    <span>
                      Email cá nhân hoặc email doanh nghiệp đều được chấp nhận.
                    </span>
                  </div>

                  {/* Người đại diện & SĐT */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AuthInput
                      label="Họ tên & Chức vụ người đại diện"
                      required
                      icon={<User size={18} weight="regular" />}
                      placeholder="Trần Quốc Huy - Trưởng phòng ATTT"
                      value={form.representativeName}
                      onChange={(e) =>
                        handleChange("representativeName", e.target.value)
                      }
                      onBlur={() => handleBlur("representativeName")}
                      error={errors.representativeName}
                    />

                    <AuthInput
                      label="Số điện thoại liên hệ công tác"
                      required
                      type="tel"
                      icon={<Phone size={18} weight="regular" />}
                      placeholder="0912 345 678"
                      value={form.contactPhone}
                      onChange={(e) =>
                        handleChange("contactPhone", e.target.value)
                      }
                      onBlur={() => handleBlur("contactPhone")}
                      error={errors.contactPhone}
                    />
                  </div>
                  <fieldset
                    aria-invalid={!!errors.legalRepresentative}
                    aria-describedby={
                      errors.legalRepresentative
                        ? "legal-representative-error"
                        : undefined
                    }
                    className="flex flex-col gap-2"
                  >
                    <legend className="text-sm font-semibold text-[#131B2E] dark:text-foreground">
                      Bạn có phải là người đại diện pháp luật của tổ chức?{" "}
                      <span className="text-[#BA1A1A]">*</span>
                    </legend>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#45464D] dark:text-foreground">
                        <input
                          type="radio"
                          name="legalRepresentative"
                          checked={form.legalRepresentative === true}
                          onChange={() => {
                            handleChange("legalRepresentative", true)
                            setAuthorizationFiles([])
                            setErrors((prev) => ({
                              ...prev,
                              legalRepresentative: undefined,
                              authorizationFiles: undefined,
                            }))
                          }}
                          className="accent-[#131A33]"
                        />
                        Có
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#45464D] dark:text-foreground">
                        <input
                          type="radio"
                          name="legalRepresentative"
                          checked={form.legalRepresentative === false}
                          onChange={() => {
                            handleChange("legalRepresentative", false)
                            setErrors((prev) => ({
                              ...prev,
                              legalRepresentative: undefined,
                            }))
                          }}
                          className="accent-[#131A33]"
                        />
                        Không, tôi được ủy quyền
                      </label>
                    </div>
                    {errors.legalRepresentative && (
                      <p
                        id="legal-representative-error"
                        className="text-xs text-[#BA1A1A] dark:text-red-400"
                      >
                        {errors.legalRepresentative}
                      </p>
                    )}
                  </fieldset>
                </div>
              </div>

              {/* ── SECTION 2: Whitelist Registration Info ── */}
              <div className="rounded-xl border border-[#EAEDFF] bg-[#F2F3FF]/70 p-4 sm:p-5 dark:border-border dark:bg-muted/40">
                <div className="mb-4 flex items-center gap-2 border-b border-[#EAEDFF] pb-3 dark:border-border">
                  <Globe
                    size={18}
                    weight="bold"
                    className="text-[#131A33] dark:text-foreground"
                  />
                  <h3 className="text-sm font-bold text-[#131B2E] dark:text-foreground">
                    2. Thông tin đăng ký Whitelist (Cần bảo vệ)
                  </h3>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Domains */}
                  <AuthInput
                    label="Tên miền chính thống (Official Domain)"
                    required
                    icon={<Globe size={18} weight="regular" />}
                    placeholder="Ví dụ: vietcombank.com.vn"
                    value={form.officialDomains}
                    onChange={(e) =>
                      handleChange("officialDomains", e.target.value)
                    }
                    onBlur={() => handleBlur("officialDomains")}
                    error={errors.officialDomains}
                  />

                  {/* Hotline & SMS Brandname */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AuthInput
                      label="Hotline / Đầu số tổng đài chính thống"
                      required
                      icon={<Headset size={18} weight="regular" />}
                      placeholder="Ví dụ: 1900 545413"
                      value={form.officialHotline}
                      onChange={(e) =>
                        handleChange("officialHotline", e.target.value)
                      }
                      onBlur={() => handleBlur("officialHotline")}
                      error={errors.officialHotline}
                    />

                    <AuthInput
                      label="Tên định danh (SMS Brandname)"
                      required
                      icon={<ChatCircleText size={18} weight="regular" />}
                      placeholder="Ví dụ: VIETCOMBANK, VCB_DIGI"
                      value={form.smsBrandname}
                      onChange={(e) =>
                        handleChange("smsBrandname", e.target.value)
                      }
                      onBlur={() => handleBlur("smsBrandname")}
                      error={errors.smsBrandname}
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Upload Proof Documents ── */}
              <div className="rounded-xl border border-[#EAEDFF] bg-[#F2F3FF]/70 p-4 sm:p-5 dark:border-border dark:bg-muted/40">
                <div className="mb-4 flex items-center gap-2 border-b border-[#EAEDFF] pb-3 dark:border-border">
                  <FileArrowUp
                    size={18}
                    weight="bold"
                    className="text-[#131A33] dark:text-foreground"
                  />
                  <h3 className="text-sm font-bold text-[#131B2E] dark:text-foreground">
                    3. Tài liệu xác thực pháp lý & chủ quyền (Upload Proof)
                  </h3>
                </div>

                {/* 3 API-compliant file upload categories */}
                <div className="flex flex-col gap-4">
                  {/* 1. businessLicenseFiles */}
                  <FileUploadBox
                    id="businessLicenseFiles"
                    label="1. Giấy phép ĐKKD / Giấy phép hoạt động"
                    required
                    accept=".pdf"
                    description="Bản PDF giấy phép ĐKKD hoặc giấy phép hoạt động ngân hàng"
                    files={businessLicenseFiles}
                    onFilesSelect={(selected) =>
                      handleFilesSelect("businessLicenseFiles", selected)
                    }
                    onRemoveFile={(idx) =>
                      handleRemoveFile("businessLicenseFiles", idx)
                    }
                    error={errors.businessLicenseFiles}
                  />

                  {/* 2. ownershipProofFiles */}
                  <FileUploadBox
                    id="ownershipProofFiles"
                    label="2. Tài liệu chứng minh sở hữu (Domain / Hotline / SMS Brandname)"
                    required
                    description="Hợp đồng viễn thông, chứng nhận sở hữu domain hoặc giấy cấp Brandname"
                    files={ownershipProofFiles}
                    onFilesSelect={(selected) =>
                      handleFilesSelect("ownershipProofFiles", selected)
                    }
                    onRemoveFile={(idx) =>
                      handleRemoveFile("ownershipProofFiles", idx)
                    }
                    error={errors.ownershipProofFiles}
                  />

                  {/* 3. authorizationFiles */}
                  {form.legalRepresentative === false && (
                    <FileUploadBox
                      id="authorizationFiles"
                      label="3. Giấy ủy quyền của tổ chức"
                      required
                      description="Văn bản ủy quyền hợp pháp của tổ chức"
                      files={authorizationFiles}
                      onFilesSelect={(selected) =>
                        handleFilesSelect("authorizationFiles", selected)
                      }
                      onRemoveFile={(idx) =>
                        handleRemoveFile("authorizationFiles", idx)
                      }
                      error={errors.authorizationFiles}
                    />
                  )}
                </div>

                {/* Checklist / Requirement box */}
                <div className="mt-4 rounded-lg bg-[#EAEDFF]/60 p-3 text-xs dark:bg-muted/60">
                  <p className="font-semibold text-[#131B2E] dark:text-foreground">
                    LƯU Ý QUY CHUẨN HỒ SƠ TẢI LÊN:
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-[#45464D] dark:text-muted-foreground">
                    <li>
                      • Giấy phép ĐKKD chỉ hỗ trợ PDF; tài liệu khác hỗ trợ PDF,
                      JPG, PNG. Dung lượng tối đa: 25MB/tệp.
                    </li>
                    <li>
                      • Toàn bộ hồ sơ không vượt quá 10 tệp và tổng dung lượng
                      không quá 75MB.
                    </li>
                    <li>
                      • Thông tin trên hồ sơ phải đồng nhất với mã số thuế và
                      tên pháp nhân đã kê khai.
                    </li>
                  </ul>
                </div>
              </div>

              {/* ── SECTION 4: Terms, CTA Button & Status Notice ── */}
              <div className="flex flex-col gap-3">
                <AuthCheckbox
                  checked={form.agreeCommitment}
                  onChange={(val) => handleChange("agreeCommitment", val)}
                  error={errors.agreeCommitment}
                >
                  Cam kết toàn bộ thông tin kê khai là chính xác và thuộc quyền
                  sở hữu hợp pháp của đơn vị.
                </AuthCheckbox>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={
                    isGettingRecaptcha || !form.agreeCommitment || cooldown > 0
                  }
                  className={cn(
                    "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#131A33] px-6 text-sm font-bold text-white shadow-md transition-all",
                    "hover:bg-[#131A33]/90 active:scale-[0.99] dark:bg-primary dark:hover:bg-primary/90",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#131A33] disabled:active:scale-100 dark:disabled:hover:bg-primary"
                  )}
                >
                  {cooldown > 0 ? (
                    <ClockCountdown size={18} weight="bold" />
                  ) : (
                    <PaperPlaneTilt size={18} weight="fill" />
                  )}
                  <span>
                    {isGettingRecaptcha
                      ? "Đang xác thực..."
                      : cooldown > 0
                        ? `Gửi lại sau ${cooldown}s`
                        : "Gửi Hồ Sơ Đăng Ký Đối Tác"}
                  </span>
                </button>

                {/* Nút mở lại pop-up OTP nếu còn trong thời gian chờ cooldown */}
                {cooldown > 0 && !isOtpOpen && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsOtpOpen(true)}
                      className="text-xs font-semibold text-[#131B2E] underline underline-offset-2 hover:opacity-80 dark:text-foreground"
                    >
                      Đã nhận được mã? Bấm vào đây để nhập mã OTP
                    </button>
                  </div>
                )}

                {/* Invisible reCAPTCHA mounting container */}
                <div id={RECAPTCHA_CONTAINER_ID} />

                {/* Notice Banner */}
                <div className="flex items-start gap-2.5 rounded-lg bg-[#EAEDFF] p-3 text-xs leading-relaxed text-[#45464D] dark:bg-muted/70 dark:text-muted-foreground">
                  <ClockCountdown
                    size={18}
                    weight="bold"
                    className="shrink-0 text-[#131A33] dark:text-foreground"
                  />
                  <span>
                    Hồ sơ và thông tin Whitelist của Quý đối tác sẽ được Quản
                    trị viên xét duyệt và đối soát trong vòng 24 - 48h làm việc
                    trước khi tài khoản được kích hoạt.
                  </span>
                </div>
              </div>

              {/* Form Footer */}
              <div className="border-t border-[#EAEDFF] pt-4 text-center sm:text-left dark:border-border">
                <p className="text-sm text-[#45464D] dark:text-muted-foreground">
                  Đã có tài khoản doanh nghiệp?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#131B2E] underline underline-offset-2 hover:opacity-80 dark:text-foreground"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* OTP Verification Pop-up */}
      <OtpVerificationPopup
        isOpen={isOtpOpen}
        onClose={() => {
          setIsOtpOpen(false)
          setOtpError(null)
          try {
            sessionStorage.removeItem(OTP_OPEN_STORAGE_KEY)
          } catch {
            // ignore
          }
        }}
        onVerify={handleOtpVerify}
        phoneNumber={form.contactPhone}
        isLoading={isSubmitting}
        error={otpError}
      />
    </div>
  )
}
