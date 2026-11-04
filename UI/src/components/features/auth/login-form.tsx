"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
  ShieldCheck,
  ShieldStar,
  Eye,
  EyeSlash,
  Lock,
  EnvelopeSimple,
  ArrowRight,
  Lightning,
  Fingerprint,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { authServices } from "@/features/auth/services/auth-services"
import { toast } from "react-toastify"
import { GoogleAuthButton } from "@/components/features/auth/google-auth-button"

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

function validateIdentifier(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return "Vui lòng nhập số điện thoại hoặc email."
  }

  // If user entered an email (contains '@')
  if (trimmed.includes("@")) {
    return EMAIL_REGEX.test(trimmed)
      ? null
      : "Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: email@domain.vn)."
  }

  // If user entered only digits (phone number)
  if (PHONE_ONLY_DIGITS.test(trimmed)) {
    return trimmed.length === 10
      ? null
      : `Số điện thoại phải gồm đúng 10 chữ số (hiện có ${trimmed.length} số).`
  }

  // If input starts with digit but contains non-digits and no '@'
  if (/^\d/.test(trimmed)) {
    return "Số điện thoại chỉ được chứa các chữ số và phải gồm đúng 10 số."
  }

  return "Vui lòng nhập email hợp lệ (có chứa @) hoặc số điện thoại 10 chữ số."
}

function validatePassword(value: string): string | null {
  if (!value) {
    return "Vui lòng nhập mật khẩu."
  }
  return value.length >= 6
    ? null
    : `Mật khẩu phải có ít nhất 6 ký tự (hiện có ${value.length} ký tự).`
}

export function LoginForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  function redirectByRole(role: string) {
    switch (role) {
      case "ADMINISTRATOR":
        router.push("/admin")
        break
      case "REGISTERED_USER":
        router.push("/user")
        break
      case "MODERATOR":
        router.push("/moderator")
        break
      case "GUEST":
        router.push("/guest")
        break
      case "BUSINESS_PARTNER":
        router.push("/business-partner")
        break
      default:
        router.push("/")
        break
    }
  }

  async function handleGoogleOAuthSuccess(credential: string) {
    setIsGoogleLoading(true)
    setServerError(null)
    try {
      const response = await authServices.loginGoogle(credential)
      toast.success(response.message || "Đăng nhập Google thành công")
      redirectByRole(response.role)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập Google thất bại"
      setServerError(msg)
      toast.error(msg)
    } finally {
      setIsGoogleLoading(false)
    }
  }
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState<{
    identifier?: boolean
    password?: boolean
  }>({})
  const [errors, setErrors] = useState<{
    identifier?: string | null
    password?: string | null
  }>({})

  function handleIdentifierBlur() {
    setTouched((prev) => ({ ...prev, identifier: true }))
    setErrors((prev) => ({
      ...prev,
      identifier: validateIdentifier(identifier),
    }))
  }

  function handlePasswordBlur() {
    setTouched((prev) => ({ ...prev, password: true }))
    setErrors((prev) => ({
      ...prev,
      password: validatePassword(password),
    }))
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    const identifierError = validateIdentifier(identifier)
    const passwordError = validatePassword(password)
    setErrors({ identifier: identifierError, password: passwordError })

    if (identifierError || passwordError) {
      return
    }

    setIsLoading(true)
    setServerError(null)

    try {
      const response = await authServices.loginByForm(
        identifier.trim(),
        password
      )
      const role = response.role

      switch (role) {
        case "ADMINISTRATOR":
          router.push("/admin")
          break
        case "REGISTERED_USER":
          router.push("/user")
          break
        case "MODERATOR":
          router.push("/moderator")
          break
        case "GUEST":
          router.push("/guest")
          break
        case "BUSINESS_PARTNER":
          router.push("/business-partner")
          break
        default:
          router.push("/")
          break
      }
      toast.success("Đăng nhập thành công")
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message || err.response?.data?.error || "Đã có lỗi xảy ra"
        )
      } else if (err instanceof Error) {
        setServerError(err.message)
      } else {
        setServerError("Đã có lỗi xảy ra")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Split Card Container */}
        <div
          className={cn(
            "overflow-hidden rounded-3xl bg-white shadow-2xl",
            "dark:bg-card dark:shadow-xl dark:shadow-black/20",
            "grid grid-cols-1 lg:grid-cols-12"
          )}
        >
          {/* ─── Left Column: Security Showcase ─── */}
          <div
            className={cn(
              "relative overflow-hidden p-8 lg:col-span-5 lg:p-12",
              "flex flex-col justify-between"
            )}
            style={{
              background:
                "linear-gradient(114deg, #0B132B 0%, #111C3D 50%, #1C2A4A 100%)",
            }}
          >
            {/* Ambient Glow Rings */}
            <div
              className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full opacity-100"
              style={{
                background: "rgba(208, 217, 253, 0.1)",
                filter: "blur(32px)",
              }}
            />
            <div
              className="pointer-events-none absolute right-[-40px] bottom-[-20px] size-80 rounded-full opacity-100"
              style={{
                background: "rgba(14, 165, 233, 0.15)",
                filter: "blur(32px)",
              }}
            />

            {/* Top Section */}
            <div className="relative z-10 flex flex-col gap-6">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-md">
                  <ShieldCheck size={24} weight="fill" className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xl font-bold tracking-tight text-white">
                      ScamShield
                    </span>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
                      VN
                    </span>
                  </div>
                  <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    AI Threat Verification • Vietnam
                  </p>
                </div>
              </div>

              {/* Hero Text */}
              <div className="flex flex-col gap-3 pt-2">
                <h2 className="font-heading text-3xl leading-tight font-extrabold tracking-tight text-white lg:text-4xl">
                  Cổng Giám Sát
                  <br />
                  An Toàn Số
                </h2>
                <p className="text-base leading-relaxed text-slate-400">
                  Hệ thống bảo vệ chủ động, ngăn chặn lừa đảo trực tuyến.
                </p>
              </div>

              {/* 3 Feature Pillars */}
              <div className="flex flex-col gap-4 pt-4">
                <FeaturePill
                  icon={
                    <ShieldStar
                      size={20}
                      weight="fill"
                      className="text-[#89CEFF]"
                    />
                  }
                  title="Bảo vệ 24/7"
                  description="Quét tự động và phát hiện đa tầng."
                />
                <FeaturePill
                  icon={
                    <Fingerprint
                      size={18}
                      weight="fill"
                      className="text-emerald-400"
                    />
                  }
                  title="Chuẩn Zero-PII"
                  description="Mã hóa bảo vệ dữ liệu tuyệt đối."
                />
                <FeaturePill
                  icon={
                    <Lightning
                      size={20}
                      weight="fill"
                      className="text-amber-300"
                    />
                  }
                  title="Liên thông xử lý"
                  description="Hỗ trợ phong tỏa nhanh rủi ro."
                />
              </div>
            </div>

            {/* Bottom spacer for visual balance */}
            <div className="h-14" />
          </div>

          {/* ─── Right Column: Login Form ─── */}
          <div className="flex flex-col justify-between px-6 py-10 sm:px-10 lg:col-span-7 lg:px-14 lg:py-14">
            <div className="mx-auto w-full max-w-lg">
              {/* Form Header */}
              <div className="pt-2 pb-8">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
                  Đăng Nhập
                </h1>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {serverError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-[#BA1A1A] dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                  >
                    <WarningCircle
                      size={18}
                      weight="fill"
                      className="shrink-0"
                    />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Identifier Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="identifier"
                    className="text-sm font-semibold text-[#131B2E] dark:text-foreground"
                  >
                    Số điện thoại hoặc Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#76767E]">
                      <EnvelopeSimple size={16} weight="regular" />
                    </div>
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        const val = e.target.value
                        setIdentifier(val)
                        if (touched.identifier || errors.identifier) {
                          setErrors((prev) => ({
                            ...prev,
                            identifier: validateIdentifier(val),
                          }))
                        }
                      }}
                      onBlur={handleIdentifierBlur}
                      placeholder="0912345678 hoặc email@domain.vn"
                      aria-invalid={!!errors.identifier}
                      aria-describedby={
                        errors.identifier ? "identifier-error" : undefined
                      }
                      className={cn(
                        "h-14 w-full rounded-xl bg-[#FAF8FF] pr-4 pl-12 text-base",
                        "text-[#131B2E] placeholder:text-[#76767E]/70",
                        "shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.05)]",
                        "transition-all outline-none",
                        "dark:bg-muted dark:text-foreground dark:placeholder:text-muted-foreground",
                        errors.identifier
                          ? "border border-[#BA1A1A] ring-2 ring-[#BA1A1A]/20 dark:border-destructive dark:ring-destructive/30"
                          : "focus:ring-2 focus:ring-[#0B132B]/20 dark:focus:ring-ring/40"
                      )}
                    />
                  </div>
                  {errors.identifier && (
                    <div
                      id="identifier-error"
                      role="alert"
                      className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-[#BA1A1A] dark:text-red-400"
                    >
                      <WarningCircle
                        size={15}
                        weight="fill"
                        className="shrink-0 text-[#BA1A1A] dark:text-red-400"
                      />
                      <span>{errors.identifier}</span>
                    </div>
                  )}
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#131B2E] dark:text-foreground"
                  >
                    Mật khẩu bảo mật
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#76767E]">
                      <Lock size={16} weight="regular" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        const val = e.target.value
                        setPassword(val)
                        if (touched.password || errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: validatePassword(val),
                          }))
                        }
                      }}
                      onBlur={handlePasswordBlur}
                      placeholder="••••••••••••"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      className={cn(
                        "h-14 w-full rounded-xl bg-[#FAF8FF] px-12 text-base",
                        "text-[#131B2E] placeholder:text-[#76767E]/70",
                        "shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.05)]",
                        "transition-all outline-none",
                        "dark:bg-muted dark:text-foreground dark:placeholder:text-muted-foreground",
                        errors.password
                          ? "border border-[#BA1A1A] ring-2 ring-[#BA1A1A]/20 dark:border-destructive dark:ring-destructive/30"
                          : "focus:ring-2 focus:ring-[#0B132B]/20 dark:focus:ring-ring/40"
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-[#76767E] hover:bg-transparent hover:text-[#131B2E] dark:hover:bg-transparent dark:hover:text-foreground"
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                    >
                      {showPassword ? (
                        <EyeSlash size={20} weight="regular" />
                      ) : (
                        <Eye size={20} weight="regular" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <div
                      id="password-error"
                      role="alert"
                      className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-[#BA1A1A] dark:text-red-400"
                    >
                      <WarningCircle
                        size={15}
                        weight="fill"
                        className="shrink-0 text-[#BA1A1A] dark:text-red-400"
                      />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                {/* Options Row */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className={cn(
                        "size-4 rounded-sm accent-[#0075FF]",
                        "dark:accent-primary"
                      )}
                    />
                    <span className="text-sm leading-snug text-[#45464D] dark:text-muted-foreground">
                      Ghi nhớ đăng nhập trên thiết bị an toàn này
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="shrink-0 text-[11px] font-semibold tracking-wider text-[#545D7C] uppercase transition-colors hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                {/* Primary Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "group mt-2 h-14 w-full gap-3 rounded-xl border-transparent",
                    "bg-[#0B132B] text-white shadow-lg shadow-black/10",
                    "hover:bg-[#111A36] active:scale-[0.99]",
                    "disabled:pointer-events-none disabled:opacity-70",
                    "dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                  )}
                >
                  {isLoading ? (
                    <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <ShieldCheck
                      size={18}
                      weight="fill"
                      className="text-[#89CEFF]"
                    />
                  )}
                  <span className="font-heading text-xl font-bold tracking-tight">
                    {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
                  </span>
                  {!isLoading && (
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="ml-1 text-white transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </Button>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-[#E2E7FF] dark:bg-border" />
                  <span className="relative bg-white px-4 text-[11px] font-bold tracking-widest text-[#45464D] uppercase dark:bg-card dark:text-muted-foreground">
                    Hoặc tiếp tục với
                  </span>
                </div>

                {/* Google Sign-In via OAuth 2.0 */}
                <GoogleAuthButton
                  text="signin_with"
                  onSuccess={handleGoogleOAuthSuccess}
                  onError={(err) => {
                    const msg = err || "Đăng nhập Google OAuth 2.0 thất bại"
                    setServerError(msg)
                    toast.error(msg)
                  }}
                  isLoading={isGoogleLoading}
                  disabled={isLoading}
                />

                {/* Registration Link */}
                <p className="pt-4 text-center text-sm text-[#45464D] dark:text-muted-foreground">
                  Chưa có tài khoản?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-[#131B2E] underline transition-colors hover:text-[#0B132B] dark:text-foreground dark:hover:text-primary"
                  >
                    Đăng ký ngay
                  </Link>
                </p>
              </form>
            </div>

            {/* Bottom spacer for visual balance */}
            <div className="h-14" />
          </div>
        </div>
      </div>

    </section>
  )
}

/* ─── Feature Pill Sub-component ─── */
function FeaturePill({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white/5 p-3 backdrop-blur-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>
      <div className="flex flex-col gap-px">
        <span className="text-sm font-bold text-white">{title}</span>
        <span className="text-sm text-slate-400">{description}</span>
      </div>
    </div>
  )
}
