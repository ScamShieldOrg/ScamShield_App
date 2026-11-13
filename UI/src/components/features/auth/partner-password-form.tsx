"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeSlash } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { authServices } from "@/features/auth/services/auth-services"

export function PartnerPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmationTouched, setConfirmationTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const passwordError = !password
    ? "Vui lòng nhập mật khẩu."
    : password.length < 6 || password.length > 100
      ? "Mật khẩu phải có từ 6 đến 100 ký tự."
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordTouched(true)
    setConfirmationTouched(true)
    if (passwordError || confirmationError || !token || submitting) return
    setSubmitting(true)
    setServerError(null)
    try {
      await authServices.setupPartnerPassword(token, password)
      toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.")
      router.replace("/login")
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Không thể đặt mật khẩu."
      )
    } finally {
      setSubmitting(false)
    }
  }
  const confirmationError = !confirmation
    ? "Vui lòng xác nhận mật khẩu."
    : confirmation !== password
      ? "Mật khẩu xác nhận không khớp."
      : null

  return (
    <section className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card px-6 py-8 shadow-xs sm:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-card-foreground">
          Đặt lại mật khẩu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {token === null && (
            <p role="alert" className="text-sm text-destructive">
              Link đặt mật khẩu không hợp lệ. Vui lòng liên hệ quản trị viên để
              được gửi lại.
            </p>
          )}
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError} Vui lòng liên hệ quản trị viên nếu link đã hết hạn.
            </p>
          )}
          <div className="space-y-2">
            <label
              htmlFor="new-password"
              className="block text-sm font-semibold text-card-foreground"
            >
              Nhập mật khẩu
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={passwordTouched && !!passwordError}
                aria-describedby={
                  passwordTouched && passwordError
                    ? "new-password-error"
                    : "password-hint"
                }
                className="h-12 w-full rounded-lg border border-input bg-background py-2 pr-12 pl-4 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                }
                aria-pressed={showPassword}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </Button>
            </div>
            {passwordTouched && passwordError ? (
              <p
                id="new-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {passwordError}
              </p>
            ) : (
              <p id="password-hint" className="text-sm text-muted-foreground">
                Mật khẩu cần có từ 6 đến 100 ký tự.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-semibold text-card-foreground"
            >
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                onBlur={() => setConfirmationTouched(true)}
                aria-invalid={confirmationTouched && !!confirmationError}
                aria-describedby={
                  confirmationTouched
                    ? confirmationError
                      ? "confirm-password-error"
                      : !passwordError
                        ? "confirm-password-match"
                        : undefined
                    : undefined
                }
                className="h-12 w-full rounded-lg border border-input bg-background py-2 pr-12 pl-4 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowConfirmation((visible) => !visible)}
                aria-label={
                  showConfirmation
                    ? "Ẩn mật khẩu xác nhận"
                    : "Hiện mật khẩu xác nhận"
                }
                aria-pressed={showConfirmation}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmation ? <EyeSlash size={20} /> : <Eye size={20} />}
              </Button>
            </div>
            {confirmationTouched && confirmationError && (
              <p
                id="confirm-password-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {confirmationError}
              </p>
            )}
            {confirmationTouched && !confirmationError && !passwordError && (
              <p
                id="confirm-password-match"
                role="status"
                className="text-sm text-emerald-700 dark:text-emerald-400"
              >
                Mật khẩu xác nhận đã khớp.
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!token || submitting}
            className="h-12 w-full rounded-lg"
          >
            {submitting ? "Đang cập nhật..." : "Thay đổi mật khẩu"}
          </Button>
        </form>
      </div>
    </section>
  )
}
