"use client"

import { useState } from "react"
import {
  Bank,
  ChatText,
  Link as LinkIcon,
  Phone,
  ClipboardText,
  Trash,
  Notebook,
  Lightning,
  CircleNotch,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ScamCheckInputType } from "@/features/check/types/scam-check.types"

interface ScamCheckInputProps {
  inputType: ScamCheckInputType
  content: string
  onTypeChange: (type: ScamCheckInputType) => void
  onContentChange: (value: string) => void
  onAnalyze: () => void
  isLoading: boolean
  error: string | null
}

const options = [
  {
    type: "MESSAGE",
    label: "Tin nhắn / Nội dung văn bản",
    Icon: ChatText,
    placeholder: "Dán tin nhắn SMS, Zalo hoặc Telegram cần kiểm tra…",
    sample:
      "Có người yêu cầu tôi chuyển tiền ngay để nhận thưởng và không được nói với người thân.",
  },
  {
    type: "URL",
    label: "Đường dẫn / Tên miền",
    Icon: LinkIcon,
    placeholder: "https://example.com hoặc example.com",
    sample: "https://example.com",
  },
  {
    type: "PHONE",
    label: "Số điện thoại / Hotline",
    Icon: Phone,
    placeholder: "0912 345 678 hoặc +84 912 345 678",
    sample: "0912345678",
  },
  {
    type: "BANK_ACCOUNT",
    label: "Tài khoản ngân hàng",
    Icon: Bank,
    placeholder: "Nhập số tài khoản từ 6 đến 30 chữ số…",
    sample: "1234567890",
  },
] as const

export function ScamCheckInput({
  inputType,
  content,
  onTypeChange,
  onContentChange,
  onAnalyze,
  isLoading,
  error,
}: ScamCheckInputProps) {
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const selected = options.find((option) => option.type === inputType)!
  const handlePaste = async () => {
    setClipboardError(null)
    try {
      onContentChange(await navigator.clipboard.readText())
    } catch {
      setClipboardError(
        "Không thể đọc bộ nhớ tạm. Vui lòng dán trực tiếp vào ô nhập."
      )
    }
  }
  const fieldProps = {
    id: "user-check-content",
    value: content,
    placeholder: selected.placeholder,
    maxLength: 10000,
    "aria-invalid": !!error,
    "aria-describedby": `user-check-hint${error ? " user-check-error" : ""}`,
    className:
      "w-full rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive",
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onAnalyze()
      }}
      aria-busy={isLoading}
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      <fieldset disabled={isLoading} className="min-w-0 space-y-4">
        <legend className="mb-3 text-sm font-semibold">
          Chọn loại nội dung
        </legend>
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {options.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              aria-pressed={inputType === type}
              onClick={() => {
                onTypeChange(type)
                setClipboardError(null)
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                inputType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" size={16} />
              {label}
            </button>
          ))}
        </div>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="user-check-content"
              className="text-sm font-semibold"
            >
              {selected.label}
            </label>
            <span className="text-xs text-muted-foreground">
              {content.length.toLocaleString("vi-VN")}/10.000 ký tự
            </span>
          </div>
          {inputType === "PHONE" ? (
            <input
              {...fieldProps}
              type="tel"
              autoComplete="off"
              onChange={(event) => onContentChange(event.target.value)}
            />
          ) : (
            <textarea
              {...fieldProps}
              rows={5}
              onChange={(event) => onContentChange(event.target.value)}
              onBlur={() => {
                if (inputType === "URL" && content !== content.trim())
                  onContentChange(content.trim())
              }}
              className={cn(fieldProps.className, "resize-y")}
            />
          )}
          <p
            id="user-check-hint"
            className="mt-2 text-xs leading-relaxed text-muted-foreground"
          >
            {inputType === "PHONE"
              ? "Dán một số điện thoại hoặc hotline. Có thể có hoặc không có khoảng trắng. Khi dùng +84 hoặc 84, bỏ số 0 đầu tiên. Ví dụ: 0912345678, +84912345678 hoặc 1900 1234."
              : inputType === "BANK_ACCOUNT"
                ? "Nhập một số tài khoản gồm 6–30 chữ số. Có thể giữ khoảng trắng, dấu chấm hoặc dấu gạch ngang."
                : inputType === "URL"
                  ? "Nhập một đường dẫn HTTP/HTTPS hoặc tên miền. Ví dụ: https://example.com hoặc example.com."
                  : "Nhập tối đa 10.000 ký tự. Tránh nhập mật khẩu hoặc mã OTP."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handlePaste()}
            >
              <ClipboardText aria-hidden="true" />
              Dán nhanh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onContentChange("")
                setClipboardError(null)
              }}
            >
              <Trash aria-hidden="true" />
              Xóa nội dung
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onContentChange(selected.sample)}
            >
              <Notebook aria-hidden="true" />
              Điền ví dụ
            </Button>
          </div>
          <Button type="submit" disabled={isLoading || !content.trim()}>
            {isLoading ? (
              <CircleNotch
                aria-hidden="true"
                className="motion-safe:animate-spin"
              />
            ) : (
              <Lightning aria-hidden="true" weight="fill" />
            )}
            {isLoading ? "Đang phân tích…" : "Phân tích"}
          </Button>
        </div>
      </fieldset>
      {clipboardError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {clipboardError}
        </p>
      )}
      {error && (
        <p
          id="user-check-error"
          role="alert"
          className="mt-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  )
}
