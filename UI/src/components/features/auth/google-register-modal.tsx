"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import {
  X,
  Phone,
  ShieldCheck,
  WarningCircle,
  ArrowRight,
  CheckCircle,
  Info,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  isPhoneVerificationCurrent,
  registerGoogleWithPhoneVerification,
  sendGoogleRegistrationOtp,
  type VerifiedGooglePhone,
} from "@/features/auth/services/google-registration.service"
import { decodeGoogleIdToken } from "@/lib/google/google-auth"

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

const RECAPTCHA_CONTAINER_ID = "google-register-recaptcha"
const OTP_RESEND_SECONDS = 60

interface GoogleRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  idToken: string
  initialPhone?: string
}

export function GoogleRegisterModal({
  isOpen,
  onClose,
  idToken,
  initialPhone = "",
}: GoogleRegisterModalProps) {
  if (!isOpen) return null

  return (
    <GoogleRegisterSession
      key={`${idToken}:${initialPhone}`}
      idToken={idToken}
      initialPhone={initialPhone}
      onClose={onClose}
    />
  )
}

function GoogleRegisterSession({
  idToken,
  initialPhone,
  onClose,
}: Omit<GoogleRegisterModalProps, "isOpen">) {
  const router = useRouter()
  const payload = decodeGoogleIdToken(idToken)

  const [phone, setPhone] = useState(initialPhone || "")
  const [otp, setOtp] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [receiveAlerts, setReceiveAlerts] = useState(false)

  const [step, setStep] = useState<
    "idle" | "sending" | "verifying" | "registering"
  >("idle")
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  const [verification, setVerification] = useState<VerifiedGooglePhone | null>(
    null
  )
  const busyRef = useRef(false)
  const activeRef = useRef(true)

  const [error, setError] = useState<string | null>(null)
  const isBusy = step !== "idle"
  const isSendingOtp = step === "sending"

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!resendAt) return
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000))
      setCooldown(remaining)
      if (!remaining) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendAt])

  const googleEmail = payload?.email || "Chưa xác định"
  const googleName = payload?.name || "Người dùng Google"

  async function handleSendOtp() {
    if (busyRef.current || Date.now() < resendAt) return
    const trimmedPhone = phone.trim()
    if (!/^0\d{9}$/.test(trimmedPhone)) {
      setError("Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số.")
      return
    }

    busyRef.current = true
    setStep("sending")
    setError(null)
    setVerification(null)
    setOtpSentTo(null)
    setOtp("")

    try {
      await sendGoogleRegistrationOtp(trimmedPhone, RECAPTCHA_CONTAINER_ID)
      if (!activeRef.current) return
      setOtpSentTo(trimmedPhone)
      setResendAt(Date.now() + OTP_RESEND_SECONDS * 1000)
      setCooldown(OTP_RESEND_SECONDS)
      toast.success("Đã gửi yêu cầu mã OTP đến " + trimmedPhone)
    } catch (err) {
      if (!activeRef.current) return
      const errMsg =
        err instanceof Error ? err.message : "Không thể gửi mã OTP."
      setError(errMsg)
      toast.error(errMsg)
    } finally {
      busyRef.current = false
      if (activeRef.current) setStep("idle")
    }
  }

  function showValidationError(message: string) {
    setError(message)
    toast.warn(message, { toastId: "google-register-validation" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busyRef.current) return
    const trimmedPhone = phone.trim()
    const trimmedOtp = otp.trim()

    if (!/^0\d{9}$/.test(trimmedPhone)) {
      showValidationError(
        "Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số."
      )
      return
    }

    if (otpSentTo !== trimmedPhone) {
      showValidationError(
        "Vui lòng gửi mã OTP cho số điện thoại này trước khi đăng ký."
      )
      return
    }

    if (!/^\d{6}$/.test(trimmedOtp)) {
      showValidationError("Mã OTP SMS phải gồm đúng 6 chữ số.")
      return
    }

    if (!agreeTerms) {
      showValidationError("Bạn phải đồng ý với Điều khoản dịch vụ để tiếp tục.")
      return
    }

    if (!payload?.sub || !payload.email) {
      setError(
        "Phiên Google không hợp lệ. Vui lòng đóng cửa sổ và chọn lại tài khoản Google."
      )
      return
    }

    if (
      verification &&
      !isPhoneVerificationCurrent(verification, trimmedPhone)
    ) {
      setVerification(null)
      setOtpSentTo(null)
      setOtp("")
      setError("Xác nhận điện thoại đã hết hạn. Vui lòng gửi mã OTP mới.")
      return
    }

    busyRef.current = true
    setStep(verification ? "registering" : "verifying")
    setError(null)

    try {
      await registerGoogleWithPhoneVerification(
        {
          idToken,
          phoneNumber: trimmedPhone,
          phoneOtp: trimmedOtp,
          agreeTerms,
          receiveAlerts,
        },
        verification,
        (verified) => {
          if (!activeRef.current) throw new Error("Phiên đăng ký đã đóng.")
          setVerification(verified)
          setStep("registering")
        }
      )

      if (!activeRef.current) return
      toast.success("Đăng ký tài khoản qua Google thành công!")
      onClose()
      router.push("/user")
    } catch (err) {
      if (!activeRef.current) return
      const msg =
        err instanceof Error ? err.message : "Đăng ký qua Google thất bại"
      setError(msg)
      toast.error(msg)
    } finally {
      busyRef.current = false
      if (activeRef.current) setStep("idle")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <GoogleIcon className="size-6" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Hoàn Tất Đăng Ký Với Google
            </h3>
            <p className="text-xs text-muted-foreground">
              Xác thực số điện thoại để hoàn tất đăng ký.
            </p>
          </div>
        </div>

        {/* Google Account Summary Card */}
        <div className="my-3 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle size={20} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">
              {googleName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {googleEmail}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            Đã xác thực Google
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="my-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-[#BA1A1A] dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
          >
            <WarningCircle size={16} weight="fill" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isBusy}
          className="mt-4 flex flex-col gap-4"
        >
          {/* Phone Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="google-register-phone"
              className="text-xs font-semibold text-foreground"
            >
              Số điện thoại chính chủ{" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                <Phone size={16} />
              </div>
              <input
                id="google-register-phone"
                type="tel"
                autoComplete="tel-national"
                value={phone}
                disabled={isBusy}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ""))
                  setOtp("")
                  setOtpSentTo(null)
                  setVerification(null)
                  setError(null)
                }}
                placeholder="0912345678"
                maxLength={10}
                required
                className="h-11 w-full rounded-xl border border-input bg-muted/30 pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
            </div>
          </div>

          {/* OTP Input with Send Button */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="google-register-otp"
              className="text-xs font-semibold text-foreground"
            >
              Mã xác thực OTP SMS <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                  <ShieldCheck size={16} />
                </div>
                <input
                  id="google-register-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={
                    isBusy ||
                    otpSentTo !== phone.trim() ||
                    isPhoneVerificationCurrent(verification, phone.trim())
                  }
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Nhập mã 6 chữ số"
                  maxLength={6}
                  required
                  className="h-11 w-full rounded-xl border border-input bg-muted/30 pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendOtp}
                disabled={
                  isBusy || cooldown > 0 || !/^0\d{9}$/.test(phone.trim())
                }
                className="h-11 shrink-0 px-4 text-xs font-semibold"
              >
                {isSendingOtp
                  ? "Đang gửi..."
                  : cooldown > 0
                    ? `Gửi lại sau ${cooldown}s`
                    : otpSentTo
                      ? "Gửi lại mã"
                      : "Gửi mã OTP"}
              </Button>
            </div>
            <div id={RECAPTCHA_CONTAINER_ID} />
            <div
              role="status"
              className="flex items-start gap-1.5 pt-1 text-[11px] text-muted-foreground"
            >
              <Info size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                {verification
                  ? "Số điện thoại đã được xác thực. Bạn có thể tiếp tục hoàn tất đăng ký."
                  : otpSentTo === phone.trim()
                    ? `Đã gửi yêu cầu OTP đến ${otpSentTo}. Vui lòng nhập mã nhận được qua SMS.`
                    : "Nhấn Gửi mã OTP để nhận mã xác thực qua SMS."}
              </span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-2 pt-1 text-xs">
            <label className="flex cursor-pointer items-start gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={agreeTerms}
                required
                disabled={isBusy}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded accent-primary"
              />
              <span>
                Tôi đồng ý với{" "}
                <span className="font-semibold text-foreground">
                  Điều khoản sử dụng
                </span>{" "}
                và{" "}
                <span className="font-semibold text-foreground">
                  Chính sách bảo mật
                </span>{" "}
                của ScamShield.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={receiveAlerts}
                disabled={isBusy}
                onChange={(e) => setReceiveAlerts(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded accent-primary"
              />
              <span>
                Nhận cảnh báo sớm về các chiêu trò lừa đảo mới qua Email/SMS.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isBusy}
            data-incomplete={
              !/^0\d{9}$/.test(phone.trim()) ||
              otpSentTo !== phone.trim() ||
              !/^\d{6}$/.test(otp.trim()) ||
              !agreeTerms
            }
            className="mt-2 h-11 w-full gap-2 rounded-xl text-sm font-bold data-[incomplete=true]:bg-primary/50 data-[incomplete=true]:hover:bg-primary/50"
          >
            {step === "verifying" || step === "registering" ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                <span>
                  {step === "verifying"
                    ? "Đang xác thực OTP..."
                    : "Đang tạo tài khoản..."}
                </span>
              </>
            ) : (
              <>
                <span>Hoàn tất đăng ký</span>
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
