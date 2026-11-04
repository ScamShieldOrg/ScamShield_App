"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "react-toastify"
import { GoogleAuthButton } from "@/components/features/auth/google-auth-button"
import { GoogleRegisterModal } from "@/components/features/auth/google-register-modal"
import { authServices } from "@/features/auth/services/auth-services"
import { getRecaptchaToken } from "@/lib/firebase/recaptcha"
import {
  User,
  Phone,
  EnvelopeSimple,
  Lock,
  Eye,
  EyeSlash,
  ShieldCheck,
  ShieldChevron,
  Sparkle,
  BellRinging,
  SealCheck,
  Gift,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatPhoneInput, normalizePhoneInput } from "@/lib/utils/phone"
import { formatOtpInput, normalizeOtpInput } from "@/lib/utils/otp"
import {
  AuthInput,
  AuthCheckbox,
  PrivilegePill,
  SocialProofBanner,
} from "@/components/features/auth/auth-shared-components"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.171 8.368h-.67V8.333H10v3.334h4.709A5.002 5.002 0 0 1 5 10a5 5 0 0 1 5-5c1.275 0 2.434.48 3.317 1.266l2.357-2.357A8.295 8.295 0 0 0 10 1.667a8.333 8.333 0 1 0 8.171 6.7Z"
        fill="#FFC107"
      />
      <path
        d="M2.628 6.121 5.366 8.13A5.002 5.002 0 0 1 10 5c1.275 0 2.434.48 3.317 1.266l2.357-2.357A8.295 8.295 0 0 0 10 1.667a8.329 8.329 0 0 0-7.372 4.454Z"
        fill="#FF3D00"
      />
      <path
        d="M10 18.333a8.294 8.294 0 0 0 5.587-2.163l-2.579-2.183A4.963 4.963 0 0 1 10 15a5.001 5.001 0 0 1-4.701-3.306l-2.72 2.095A8.327 8.327 0 0 0 10 18.333Z"
        fill="#4CAF50"
      />
      <path
        d="M18.171 8.368H17.5V8.333H10v3.334h4.71a5.018 5.018 0 0 1-1.703 2.32l.001-.001 2.58 2.183C15.404 16.336 18.333 14.167 18.333 10c0-.567-.056-1.12-.162-1.632Z"
        fill="#1976D2"
      />
    </svg>
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_ONLY_DIGITS = /^\d+$/
const FULL_NAME_REGEX = /^\p{Lu}\p{Ll}*(\s+\p{Lu}\p{Ll}*)*$/u
const OTP_REGEX = /^\d{6}$/
const OTP_RESEND_SECONDS = 60
const RECAPTCHA_CONTAINER_ID = "register-recaptcha"

interface FormState {
  fullName: string
  phone: string
  otp: string
  email: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
  receiveAlerts: boolean
}

interface FormErrors {
  fullName?: string
  phone?: string
  otp?: string
  email?: string
  password?: string
  confirmPassword?: string
  agreeTerms?: string
}

export function RegisterIndividualForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGoogleRegisterModalOpen, setIsGoogleRegisterModalOpen] =
    useState(false)
  const [googleIdToken, setGoogleIdToken] = useState("")

  function handleGoogleOAuthSuccess(credential: string) {
    setGoogleIdToken(credential)
    setIsGoogleRegisterModalOpen(true)
  }
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    otp: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    receiveAlerts: false,
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function validateField(
    name: keyof FormState,
    value: unknown,
    currentForm = form
  ): string | undefined {
    switch (name) {
      case "fullName": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập họ và tên."
        if (val.length < 2) return "Họ và tên phải có ít nhất 2 ký tự."
        if (!FULL_NAME_REGEX.test(val))
          return "Họ và tên phải viết hoa chữ cái đầu của mỗi từ."
        return undefined
      }
      case "otp": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập mã OTP."
        if (!OTP_REGEX.test(val)) return "Mã OTP gồm đúng 6 chữ số."
        return undefined
      }
      case "phone": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập số điện thoại."
        if (!PHONE_ONLY_DIGITS.test(val))
          return "Số điện thoại chỉ bao gồm các chữ số."
        if (val.length !== 10)
          return `Số điện thoại phải gồm đúng 10 số (hiện có ${val.length} số).`
        return undefined
      }
      case "email": {
        const val = String(value).trim()
        if (!val) return "Vui lòng nhập địa chỉ email."
        if (!EMAIL_REGEX.test(val))
          return "Địa chỉ email không đúng định dạng (ví dụ: email@domain.vn)."
        return undefined
      }
      case "password": {
        const val = String(value)
        if (!val) return "Vui lòng nhập mật khẩu."
        if (val.length < 6)
          return `Mật khẩu phải có ít nhất 6 ký tự (hiện có ${val.length} ký tự).`
        return undefined
      }
      case "confirmPassword": {
        const val = String(value)
        if (!val) return "Vui lòng xác nhận mật khẩu."
        if (val !== currentForm.password) return "Mật khẩu xác nhận không khớp."
        return undefined
      }
      case "agreeTerms": {
        if (!value)
          return "Bạn cần đồng ý với Điều khoản sử dụng và Cam kết Zero-PII để tiếp tục."
        return undefined
      }
      default:
        return undefined
    }
  }

  function handleBlur(field: keyof FormState) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, form[field]),
    }))
  }

  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    const nextForm = { ...form, [field]: value }
    setForm(nextForm)

    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value, nextForm),
      }))
    }

    if (field === "password" && touched.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: validateField(
          "confirmPassword",
          nextForm.confirmPassword,
          nextForm
        ),
      }))
    }
  }

  async function handleSendOtp() {
    const phoneError = validateField("phone", form.phone)
    setTouched((prev) => ({ ...prev, phone: true }))
    setErrors((prev) => ({ ...prev, phone: phoneError }))
    if (phoneError || isSendingOtp || cooldown > 0) return

    setIsSendingOtp(true)
    setServerError(null)
    try {
      const recaptchaToken = await getRecaptchaToken(RECAPTCHA_CONTAINER_ID)
      const phone = form.phone.trim()
      await authServices.sendPhoneOtp(phone, recaptchaToken)
      setOtpSentTo(phone)
      setCooldown(OTP_RESEND_SECONDS)
      toast.success("Đã gửi mã OTP đến số điện thoại của bạn")
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Không thể gửi mã OTP."
      )
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    setServerError(null)

    const newErrors: FormErrors = {
      fullName: validateField("fullName", form.fullName),
      phone: validateField("phone", form.phone),
      otp: validateField("otp", form.otp),
      email: validateField("email", form.email),
      password: validateField("password", form.password),
      confirmPassword: validateField("confirmPassword", form.confirmPassword),
      agreeTerms: validateField("agreeTerms", form.agreeTerms),
    }

    setTouched({
      fullName: true,
      phone: true,
      otp: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true,
    })

    setErrors(newErrors)

    const hasError = Object.values(newErrors).some(Boolean)
    if (hasError) return

    const phone = form.phone.trim()
    if (otpSentTo !== phone) {
      setErrors((prev) => ({
        ...prev,
        otp: 'Vui lòng nhấn "Gửi mã" để nhận OTP cho số điện thoại này.',
      }))
      return
    }

    setIsSubmitting(true)
    try {
      const { verificationToken } = await authServices.verifyContacts(
        phone,
        form.otp.trim()
      )
      await authServices.registerPersonal({
        fullName: form.fullName.trim(),
        phoneNumber: phone,
        email: form.email.trim(),
        password: form.password,
        verificationToken,
        agreeTerms: form.agreeTerms,
        receiveAlerts: form.receiveAlerts,
      })
      setIsSubmittedSuccess(true)
      toast.success("Đăng ký thành công")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Đăng ký thất bại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
      {/* ─── Left Column: Sentinel Community Privileges Card ─── */}
      <div
        className={cn(
          "relative flex flex-col justify-between overflow-hidden rounded-2xl p-8 sm:p-10 lg:col-span-5",
          "shadow-xl"
        )}
        style={{
          background:
            "linear-gradient(110deg, #131A33 0%, #283044 50%, #000000 100%)",
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
          {/* Initial Sentinel Rank Badge */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wider text-[#DBE1FF] uppercase backdrop-blur-md">
              <ShieldChevron
                size={14}
                weight="fill"
                className="text-[#DBE1FF]"
              />
              <span>CẤP BẬC KHỞI ĐẦU: SENTINEL LV.1</span>
            </div>
          </div>

          {/* Hero Title & Subtitle */}
          <div className="space-y-2">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white lg:text-[34px]">
              Chung sức bảo vệ cộng đồng
            </h2>
            <p className="text-sm leading-relaxed text-[#DAE2FD]/80">
              Chung tay bảo vệ gia đình và cộng đồng mạng Việt Nam.
            </p>
          </div>

          {/* Key Privileges Checklist */}
          <div className="mt-2 flex flex-col gap-3">
            <PrivilegePill
              icon={<Sparkle size={20} weight="fill" />}
              title="Tính năng AI"
              description="Tra cứu chuyên sâu Deepfake, STK lừa đảo, SMS độc hại."
            />
            <PrivilegePill
              icon={<BellRinging size={20} weight="fill" />}
              title="Cảnh báo sớm 24h"
              description="Cập nhật mối đe dọa, trạm phát giả mạo theo khu vực."
            />
            <PrivilegePill
              icon={<SealCheck size={20} weight="fill" />}
              title="Bảo chứng A05 & NCSC"
              description="Được kết nối xử lý và xác thực chính thống."
            />
            <PrivilegePill
              icon={<Gift size={20} weight="fill" />}
              title="Điểm thưởng hàng tháng"
              description="Đổi bản quyền bảo mật số và đặc quyền công dân."
            />
          </div>
        </div>

        {/* Social Proof Stats Banner */}
        <SocialProofBanner
          avatars={[
            { text: "AN", bg: "#EAEDFF", color: "#131B2E" },
            { text: "TH", bg: "#D0D9FD", color: "#555E7D" },
            { text: "DK", bg: "#C9E6FF", color: "#001E2F" },
          ]}
          badgeText="+128k"
          title="128.450+ Người đã tham gia"
          subtitle="Đang hoạt động trên toàn quốc"
        />
      </div>

      {/* ─── Right Column: Registration Form Card ─── */}
      <div className="flex flex-col rounded-2xl border border-[#E2E7FF] bg-white p-6 shadow-sm sm:p-10 lg:col-span-7 dark:border-border dark:bg-card">
        <div className="mx-auto w-full">
          {/* Form Header */}
          <div className="mb-6">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
              Đăng Ký Tài Khoản
            </h1>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {serverError}
            </div>
          )}

          {/* Success Banner */}
          {isSubmittedSuccess && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <ShieldCheck
                size={24}
                weight="fill"
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div className="text-sm">
                <p className="font-semibold">Đăng ký thành công!</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  Thông tin tài khoản của bạn đã được tiếp nhận. Đăng nhập để
                  kích hoạt quyền Sentinel.
                </p>
              </div>
            </div>
          )}

          {/* Quick Google SSO */}
          <div className="flex flex-col gap-5">
            <GoogleAuthButton
              text="signup_with"
              label="Đăng ký bằng Google"
              onSuccess={handleGoogleOAuthSuccess}
              onError={(err) => {
                toast.error(err || "Kết nối Google OAuth 2.0 thất bại")
              }}
              isLoading={isGoogleLoading}
              disabled={isSubmitting}
            />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#D1DEFF] dark:bg-border" />
              <span className="text-[11px] font-bold tracking-wider text-[#45464D] uppercase dark:text-muted-foreground">
                HOẶC BIỂU MẪU
              </span>
              <div className="h-px flex-1 bg-[#D1DEFF] dark:bg-border" />
            </div>
          </div>

          {/* Detailed Registration Form */}
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            {/* Họ và tên */}
            <AuthInput
              label="Họ và tên"
              required
              icon={<User size={18} weight="regular" />}
              placeholder="Họ và tên"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              onBlur={() => handleBlur("fullName")}
              error={errors.fullName}
            />

            {/* Phone and OTP share a row on wider screens */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthInput
                label="Số điện thoại"
                required
                type="tel"
                icon={<Phone size={18} weight="regular" />}
                placeholder="0912 345 678"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={12}
                value={formatPhoneInput(form.phone)}
                onChange={(e) =>
                  handleChange("phone", normalizePhoneInput(e.target.value))
                }
                onBlur={() => handleBlur("phone")}
                error={errors.phone}
              />

              <AuthInput
                id="register-otp"
                label="Mã xác thực OTP"
                required
                inputMode="numeric"
                maxLength={7}
                icon={<ShieldCheck size={18} weight="regular" />}
                placeholder="Nhập mã 6 chữ số"
                value={formatOtpInput(form.otp)}
                onChange={(e) =>
                  handleChange("otp", normalizeOtpInput(e.target.value))
                }
                onBlur={() => handleBlur("otp")}
                error={errors.otp}
                actionLabel={
                  isSendingOtp
                    ? "Đang gửi..."
                    : cooldown > 0
                      ? `Gửi lại sau ${cooldown}s`
                      : otpSentTo
                        ? "Gửi lại mã"
                        : "Gửi mã OTP"
                }
                inlineAction
                actionDisabled={isSendingOtp || cooldown > 0}
                onActionClick={handleSendOtp}
              />
            </div>
            <AuthInput
              label="Địa chỉ Email"
              required
              type="email"
              icon={<EnvelopeSimple size={18} weight="regular" />}
              placeholder="Email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              error={errors.email}
            />
            <div id={RECAPTCHA_CONTAINER_ID} />

            {/* Mật khẩu */}
            <AuthInput
              label="Mật khẩu"
              required
              type={showPassword ? "text" : "password"}
              icon={<Lock size={18} weight="regular" />}
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              error={errors.password}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="hover:text-[#131B2E] dark:hover:text-foreground"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {/* Xác nhận mật khẩu */}
            <AuthInput
              label="Xác nhận mật khẩu"
              required
              type={showConfirmPassword ? "text" : "password"}
              icon={<Lock size={18} weight="regular" />}
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              error={errors.confirmPassword}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={
                    showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                  }
                  className="hover:text-[#131B2E] dark:hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeSlash size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              }
            />

            {/* Agreement Checkboxes */}
            <div className="mt-2 flex flex-col gap-2.5">
              <AuthCheckbox
                checked={form.agreeTerms}
                onChange={(val) => handleChange("agreeTerms", val)}
                error={errors.agreeTerms}
              >
                Tôi đồng ý với{" "}
                <Link
                  href="/guest/terms"
                  className="font-semibold text-[#131B2E] underline underline-offset-2 dark:text-foreground"
                >
                  Điều khoản sử dụng
                </Link>{" "}
                &{" "}
                <Link
                  href="/guest/privacy"
                  className="font-semibold text-[#131B2E] underline underline-offset-2 dark:text-foreground"
                >
                  Cam kết Zero-PII
                </Link>
              </AuthCheckbox>

              <AuthCheckbox
                checked={form.receiveAlerts}
                onChange={(val) => handleChange("receiveAlerts", val)}
                boxClassName={
                  form.receiveAlerts
                    ? "border-[#0075FF] bg-[#0075FF] text-white"
                    : undefined
                }
              >
                Nhận cảnh báo an ninh khẩn cấp
              </AuthCheckbox>
            </div>

            {/* Primary Submit CTA */}
            <div className="mt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#131A33] px-6 text-sm font-bold text-white shadow-md transition-all",
                  "hover:bg-[#131A33]/90 active:scale-[0.99] dark:bg-primary dark:hover:bg-primary/90"
                )}
              >
                <ShieldCheck size={20} weight="fill" />
                <span>
                  {isSubmitting ? "Đang xử lý..." : "Tạo Tài Khoản An Toàn"}
                </span>
              </button>
            </div>
          </form>

          {/* Form Footer */}
          <div className="mt-6 border-t border-[#EAEDFF] pt-4 text-center sm:text-left dark:border-border">
            <p className="text-sm text-[#45464D] dark:text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-bold text-[#131B2E] underline underline-offset-2 hover:opacity-80 dark:text-foreground"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Google Registration Phone & OTP Verification Modal */}
      {isGoogleRegisterModalOpen && googleIdToken && (
        <GoogleRegisterModal
          isOpen={isGoogleRegisterModalOpen}
          onClose={() => setIsGoogleRegisterModalOpen(false)}
          idToken={googleIdToken}
          initialPhone={form.phone}
        />
      )}
    </div>
  )
}
