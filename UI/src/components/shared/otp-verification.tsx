"use client"

import { useState, useEffect } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { ShieldCheck, X } from "@phosphor-icons/react"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"

export interface InputOTPPatternProps {
  label?: string
  lable?: string
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: string
  autoFocus?: boolean
}

export function InputOTPPattern({
  label,
  lable,
  value = "",
  onChange,
  disabled = false,
  error,
  autoFocus = true,
}: InputOTPPatternProps) {
  const displayLabel = label ?? lable ?? "Mã xác thực OTP"

  return (
    <Field className="flex w-full flex-col items-center">
      {displayLabel && (
        <FieldLabel
          htmlFor="otp-input"
          className="mb-2 text-center text-xs font-semibold text-[#131B2E] dark:text-foreground"
        >
          {displayLabel}
        </FieldLabel>
      )}
      <InputOTP
        id="otp-input"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
      >
        <InputOTPGroup className="gap-2">
          <InputOTPSlot
            index={0}
            className="size-11 rounded-lg text-lg font-bold"
          />
          <InputOTPSlot
            index={1}
            className="size-11 rounded-lg text-lg font-bold"
          />
          <InputOTPSlot
            index={2}
            className="size-11 rounded-lg text-lg font-bold"
          />
          <InputOTPSlot
            index={3}
            className="size-11 rounded-lg text-lg font-bold"
          />
          <InputOTPSlot
            index={4}
            className="size-11 rounded-lg text-lg font-bold"
          />
          <InputOTPSlot
            index={5}
            className="size-11 rounded-lg text-lg font-bold"
          />
        </InputOTPGroup>
      </InputOTP>
      {error && (
        <p className="mt-2 text-center text-xs text-[#BA1A1A] dark:text-red-400">
          {error}
        </p>
      )}
    </Field>
  )
}

export interface OtpVerificationPopupProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (otp: string) => void
  phoneNumber?: string
  isLoading?: boolean
  error?: string | null
  progressContent?: React.ReactNode
}

export function OtpVerificationPopup({
  isOpen,
  onClose,
  onVerify,
  phoneNumber,
  isLoading = false,
  error: externalError,
  progressContent,
}: OtpVerificationPopupProps) {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Reset OTP when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setOtp("")
      setError(null)
    }
  }, [isOpen])

  // Sync external error
  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  if (!isOpen) return null

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (otp.length < 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.")
      return
    }
    setError(null)
    onVerify(otp)
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs duration-200 fade-in">
      <div
        className="relative w-full max-w-md animate-in rounded-2xl border border-[#D1DEFF] bg-white p-6 shadow-2xl duration-200 zoom-in-95 dark:border-border dark:bg-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-popup-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-lg p-1 text-[#76767E] transition-colors hover:bg-[#EAEDFF] hover:text-[#131B2E] disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#EAEDFF] text-[#131A33] dark:bg-primary/20 dark:text-primary">
            <ShieldCheck size={28} weight="fill" />
          </div>
          <h2
            id="otp-popup-title"
            className="text-lg font-bold text-[#131B2E] dark:text-foreground"
          >
            Xác thực số điện thoại
          </h2>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#545D7C] dark:text-muted-foreground">
            Vui lòng nhập mã OTP 6 chữ số{" "}
            {phoneNumber ? (
              <>
                được gửi tới số điện thoại{" "}
                <span className="font-semibold text-[#131B2E] dark:text-foreground">
                  {phoneNumber}
                </span>
              </>
            ) : (
              "được gửi tới số điện thoại của bạn"
            )}
            .
          </p>
        </div>

        {/* OTP Input Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col items-center gap-5"
        >
          <InputOTPPattern
            label="MÃ XÁC THỰC (6 CHỮ SỐ)"
            value={otp}
            onChange={(val) => {
              setOtp(val)
              if (error) setError(null)
            }}
            disabled={isLoading}
            error={error || undefined}
          />
          {isLoading && progressContent}

          {/* Action Buttons */}
          <div className="flex w-full flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={otp.length < 6 || isLoading}
              className="h-11 w-full rounded-lg bg-[#131A33] text-sm font-bold text-white shadow-sm hover:bg-[#131A33]/90 dark:bg-primary dark:text-primary-foreground"
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận OTP"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 w-full text-xs"
            >
              Hủy bỏ
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
