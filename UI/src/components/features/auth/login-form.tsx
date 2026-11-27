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
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"

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
  const { theme } = useScamCheckTheme()

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
    <section className="flex flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Two-Layer Tactile Bezel Shell */}
        <div
          className={cn(
            "rounded-3xl border p-1.5 transition-[border-color,box-shadow] duration-200",
            theme.composerBezel
          )}
        >
          {/* Split Card Container */}
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-black/8 bg-card/95 backdrop-blur-md lg:grid-cols-12 dark:border-white/10">
            {/* ─── Left Column: Security Showcase (Theme-Synced) ─── */}
            <div
              className={cn(
                "relative flex flex-col justify-between overflow-hidden p-8 transition-colors duration-200 lg:col-span-5 lg:p-10",
                theme.authPanelBg
              )}
            >
              {/* Subtle Blueprint Dot-Grid inside Left Panel */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_90%_80%_at_25%_20%,#000_35%,transparent_100%)]"
              />

              {/* Top Section */}
              <div className="relative z-10 flex flex-col gap-6">
                {/* Brand */}
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-md">
                    <ShieldCheck
                      aria-hidden="true"
                      size={22}
                      weight="fill"
                      className={theme.authPanelAccent}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-lg font-bold tracking-tight text-white">
                        ScamShield
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-semibold tracking-wider text-white uppercase">
                        VN
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-300/80">
                      AI Threat Verification · Vietnam
                    </p>
                  </div>
                </div>

                {/* Hero Text */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <h2 className="font-heading text-2xl leading-tight font-bold tracking-[-0.025em] text-white sm:text-3xl">
                    Cổng Giám Sát
                    <br />
                    An Toàn Số
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-300/85">
                    Hệ thống bảo vệ chủ động 2 tầng, ngăn chặn tin nhắn, liên
                    kết và giao dịch lừa đảo trực tuyến.
                  </p>
                </div>

                {/* 3 Feature Pillars */}
                <div className="flex flex-col gap-3 pt-2">
                  <FeaturePill
                    icon={
                      <ShieldStar
                        aria-hidden="true"
                        size={19}
                        weight="fill"
                        className={theme.authPanelAccent}
                      />
                    }
                    title="Bảo vệ 24/7"
                    description="Quét tự động và phát hiện đa tầng."
                  />
                  <FeaturePill
                    icon={
                      <Fingerprint
                        aria-hidden="true"
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
                        aria-hidden="true"
                        size={19}
                        weight="fill"
                        className="text-amber-300"
                      />
                    }
                    title="Liên thông xử lý"
                    description="Hỗ trợ cảnh báo và phong tỏa nhanh rủi ro."
                  />
                </div>
              </div>

              <div className="relative z-10 mt-8 border-t border-white/10 pt-4 text-xs text-slate-300/75">
                Xác thực an toàn · Mã hóa phiên đăng nhập
              </div>
            </div>

            {/* ─── Right Column: Login Form ─── */}
            <div className="flex flex-col justify-center px-6 py-9 sm:px-10 lg:col-span-7 lg:px-12 lg:py-12">
              <div className="mx-auto w-full max-w-md">
                {/* Form Header */}
                <div className="mb-7 space-y-1.5">
                  <h1 className="font-heading text-3xl font-bold tracking-[-0.025em] text-foreground">
                    Đăng nhập
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Tiếp tục theo dõi lịch sử kiểm tra, báo cáo và cảnh báo của
                    bạn.
                  </p>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {serverError && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm font-medium text-rose-800 dark:text-rose-300"
                    >
                      <WarningCircle
                        aria-hidden="true"
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
                      className="text-sm font-semibold text-foreground"
                    >
                      Số điện thoại hoặc Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                        <EnvelopeSimple
                          aria-hidden="true"
                          size={16}
                          weight="regular"
                        />
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
                          "h-12 w-full rounded-xl border bg-background/85 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground/75",
                          "border-border shadow-2xs transition-[border-color,box-shadow] outline-none",
                          "dark:border-white/12 dark:bg-white/[0.04]",
                          errors.identifier
                            ? "border-rose-500/70 ring-2 ring-rose-500/20"
                            : "focus:border-foreground/40 focus:ring-2 focus:ring-ring/25 dark:focus:border-white/30"
                        )}
                      />
                    </div>
                    {errors.identifier && (
                      <div
                        id="identifier-error"
                        role="alert"
                        className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                      >
                        <WarningCircle
                          aria-hidden="true"
                          size={14}
                          weight="fill"
                          className="shrink-0"
                        />
                        <span>{errors.identifier}</span>
                      </div>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="password"
                        className="text-sm font-semibold text-foreground"
                      >
                        Mật khẩu bảo mật
                      </label>
                      <Link
                        href="/forgot-password"
                        className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                        <Lock aria-hidden="true" size={16} weight="regular" />
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
                          "h-12 w-full rounded-xl border bg-background/85 px-10 text-sm text-foreground placeholder:text-muted-foreground/75",
                          "border-border shadow-2xs transition-[border-color,box-shadow] outline-none",
                          "dark:border-white/12 dark:bg-white/[0.04]",
                          errors.password
                            ? "border-rose-500/70 ring-2 ring-rose-500/20"
                            : "focus:border-foreground/40 focus:ring-2 focus:ring-ring/25 dark:focus:border-white/30"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeSlash
                            aria-hidden="true"
                            size={18}
                            weight="regular"
                          />
                        ) : (
                          <Eye aria-hidden="true" size={18} weight="regular" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <div
                        id="password-error"
                        role="alert"
                        className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-rose-700 dark:text-rose-400"
                      >
                        <WarningCircle
                          aria-hidden="true"
                          size={14}
                          weight="fill"
                          className="shrink-0"
                        />
                        <span>{errors.password}</span>
                      </div>
                    )}
                  </div>

                  {/* Remember Row */}
                  <label className="flex cursor-pointer items-center gap-2.5 pt-0.5">
                    <input
                      type="checkbox"
                      className="size-4 rounded-sm accent-foreground"
                    />
                    <span className="text-xs leading-snug text-muted-foreground">
                      Ghi nhớ đăng nhập trên thiết bị an toàn này
                    </span>
                  </label>

                  {/* Primary Submit Button (Pill + Theme-Synced) */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "group mt-1 h-12 w-full cursor-pointer gap-2.5 rounded-full border-transparent text-sm font-semibold active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70",
                      theme.ctaButton
                    )}
                  >
                    {isLoading ? (
                      <span className="inline-flex size-4 rounded-full border-2 border-current/30 border-t-current motion-safe:animate-spin" />
                    ) : (
                      <ShieldCheck
                        aria-hidden="true"
                        size={18}
                        weight="fill"
                      />
                    )}
                    <span>{isLoading ? "Đang xử lý..." : "Đăng nhập"}</span>
                    {!isLoading && (
                      <ArrowRight
                        aria-hidden="true"
                        size={15}
                        weight="bold"
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center py-1.5">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border dark:bg-white/10" />
                    <span className="relative bg-card px-3 text-xs font-medium text-muted-foreground">
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
                  <p className="pt-2 text-center text-sm text-muted-foreground">
                    Chưa có tài khoản?{" "}
                    <Link
                      href="/register"
                      className="font-semibold text-foreground underline underline-offset-4 transition-colors hover:opacity-80"
                    >
                      Đăng ký ngay
                    </Link>
                  </p>
                </form>
              </div>
            </div>
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
    <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xs">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs text-slate-300/80">{description}</span>
      </div>
    </div>
  )
}
