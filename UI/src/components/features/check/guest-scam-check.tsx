"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Bank,
  ChatText,
  CircleNotch,
  GlobeHemisphereWest,
  Phone,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useGuestScamCheck } from "@/features/check/hooks/use-guest-scam-check"
import type { GuestInputType } from "@/features/check/types/guest-check.types"
import { cn } from "@/lib/utils"
import { GuestCheckVerdict } from "./guest-check-verdict"

const inputOptions = [
  {
    type: "MESSAGE",
    label: "Tin nhắn / Chat",
    placeholder: "Dán nội dung tin nhắn cần kiểm tra…",
    Icon: ChatText,
  },
  {
    type: "URL",
    label: "Website / Đường dẫn",
    placeholder: "https://example.com",
    Icon: GlobeHemisphereWest,
  },
  {
    type: "PHONE",
    label: "Số điện thoại / Hotline",
    placeholder: "Ví dụ: 0912 345 678 hoặc +84 912 345 678",
    Icon: Phone,
  },
  {
    type: "BANK_ACCOUNT",
    label: "Tài khoản ngân hàng",
    placeholder: "Nhập số tài khoản ngân hàng…",
    Icon: Bank,
  },
] as const

function resetTime(value: string) {
  // Core returns a Vietnam local timestamp without an offset.
  const date = new Date(`${value}+07:00`)
  if (Number.isNaN(date.getTime())) return "00:00 giờ Việt Nam"
  return `${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(date)} (giờ Việt Nam)`
}

export function GuestScamCheck() {
  const [inputType, setInputType] = useState<GuestInputType>("MESSAGE")
  const [drafts, setDrafts] = useState<Partial<Record<GuestInputType, string>>>(
    {}
  )
  const content = drafts[inputType] ?? ""
  const setContent = (value: string) => {
    setDrafts((previous) => ({ ...previous, [inputType]: value }))
  }
  const {
    phase,
    quota,
    result,
    error,
    quotaError,
    submit,
    refreshQuota,
    clearResult,
  } = useGuestScamCheck(inputType)
  const busy = phase !== "idle"
  const selected = inputOptions.find((option) => option.type === inputType)!
  const exhausted = quota?.remaining === 0 && !quotaError
  const progress =
    phase === "scanning"
      ? "Đang phân tích nội dung…"
      : phase === "updating"
        ? "Đang cập nhật lượt còn lại…"
        : "Đang kiểm tra lượt còn lại…"

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-12">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-foreground">
        <Sparkle aria-hidden="true" weight="fill" /> Phân tích nội dung đáng ngờ
      </div>
      <h1 className="mb-4 text-center text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl">
        Kiểm tra trước khi tin tưởng
        <br />
        Bảo vệ bạn khỏi lừa đảo số
      </h1>
      <p className="mb-10 max-w-2xl text-center text-lg text-muted-foreground">
        Kiểm tra tin nhắn, tài khoản ngân hàng, liên kết web hoặc số điện thoại
        lạ với dữ liệu xác minh và phân tích AI.
      </p>

      <form
        className="mb-6 w-full rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault()
          if (inputType === "URL") setContent(content.trim())
          void submit({ inputType, content })
        }}
      >
        <fieldset disabled={busy} className="min-w-0">
          <legend className="mb-3 text-sm font-semibold">
            Chọn loại nội dung
          </legend>
          <div className="mb-6 flex flex-wrap gap-2">
            {inputOptions.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                aria-pressed={type === inputType}
                onClick={() => {
                  setInputType(type)
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  type === inputType
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <label
            htmlFor="guest-check-content"
            className="mb-3 block text-sm font-semibold"
          >
            {selected.label}
          </label>
          {inputType === "PHONE" ? (
            <input
              id="guest-check-content"
              type="tel"
              autoComplete="off"
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                clearResult()
              }}
              placeholder={selected.placeholder}
              maxLength={10000}
              aria-invalid={!!error}
              aria-describedby={`guest-phone-format guest-check-hint${error ? " guest-check-error" : ""}`}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-invalid:border-destructive"
            />
          ) : (
            <textarea
              id="guest-check-content"
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                clearResult()
              }}
              onBlur={() => {
                if (inputType === "URL" && content !== content.trim())
                  setContent(content.trim())
              }}
              placeholder={selected.placeholder}
              maxLength={10000}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? "guest-check-hint guest-check-error"
                  : "guest-check-hint"
              }
              className="min-h-36 w-full resize-y rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          )}
          {inputType === "PHONE" && (
            <div
              id="guest-phone-format"
              className="mt-3 space-y-2 text-sm text-muted-foreground"
            >
              <p>
                Chỉ dán một số điện thoại hoặc hotline. Có thể giữ khoảng trắng,
                dấu chấm, dấu gạch ngang hoặc dấu ngoặc.
              </p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <li>
                  Trong nước:{" "}
                  <span className="font-mono font-medium text-foreground">
                    0912 345 678
                  </span>
                </li>
                <li>
                  Quốc tế:{" "}
                  <span className="font-mono font-medium text-foreground">
                    +84 912 345 678
                  </span>{" "}
                  hoặc{" "}
                  <span className="font-mono font-medium text-foreground">
                    84912345678
                  </span>
                </li>
                <li>
                  Hotline:{" "}
                  <span className="font-mono font-medium text-foreground">
                    1900 1234
                  </span>
                </li>
              </ul>
              <p>
                Khi dùng mã quốc gia +84 hoặc 84, bỏ số 0 ở đầu. Ví dụ: 0912 345
                678 → +84 912 345 678.
              </p>
            </div>
          )}
          <div
            id="guest-check-hint"
            className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
          >
            {inputType !== "PHONE" && (
              <span>{content.length.toLocaleString("vi-VN")}/10.000</span>
            )}
          </div>
        </fieldset>

        <div className="mt-5 space-y-3 rounded-lg bg-muted/50 p-4 text-sm">
          <div role="status" aria-live="polite">
            {busy && (
              <p className="mb-2 flex items-center gap-2">
                <CircleNotch
                  aria-hidden="true"
                  className="size-4 motion-safe:animate-spin"
                />
                {progress}
              </p>
            )}
            {quota && (
              <p className="font-medium">
                {quotaError
                  ? "Thông tin lượt gần nhất"
                  : "Lượt kiểm tra hôm nay"}
                : {quota.remaining}/{quota.limit} lượt còn lại
              </p>
            )}
            {quota && (
              <p className="mt-1 text-xs text-muted-foreground">
                Đặt lại lúc {resetTime(quota.resetsAt)}
              </p>
            )}
          </div>
          {quotaError && (
            <p role="alert" className="text-destructive">
              {quotaError}
            </p>
          )}
          {exhausted && (
            <p>
              Đã hết lượt hôm nay.{" "}
              <Link
                href="/login"
                className="font-semibold underline underline-offset-4"
              >
                Đăng nhập
              </Link>{" "}
              để sử dụng hạn mức tài khoản.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void refreshQuota()}
          >
            Cập nhật lượt còn lại
          </Button>
        </div>
        {error && (
          <p
            id="guest-check-error"
            role="alert"
            className="mt-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setContent("")
              clearResult()
            }}
          >
            Làm mới
          </Button>
          <Button
            type="submit"
            disabled={busy || !content.trim() || !quota || !!exhausted}
            className="gap-2"
          >
            {busy ? (
              <CircleNotch
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            ) : (
              <ShieldCheck aria-hidden="true" className="size-4" />
            )}
            {busy ? "Đang xử lý…" : "Phân tích"}
          </Button>
        </div>
      </form>

      {phase === "scanning" && (
        <div
          aria-hidden="true"
          className="mb-6 w-full space-y-4 rounded-2xl border border-border bg-card p-6 motion-safe:animate-pulse"
        >
          <div className="h-5 w-1/2 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-16 rounded-lg bg-muted" />
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {result
          ? `Đã có kết quả kiểm tra số ${result.checkId}. ${
              `${result.verdict === "LOW_RISK" ? "Mức độ rủi ro thấp" : result.verdict === "SCAM_RISK" ? "Có nguy cơ lừa đảo" : result.verdict === "SUSPICIOUS" ? "Có dấu hiệu đáng ngờ" : "Chưa đủ cơ sở kết luận"}.`
            }`
          : ""}
      </div>
      {result && <GuestCheckVerdict result={result} />}
      {!result && !busy && (
        <p className="text-center text-sm text-muted-foreground">
          Nhập nội dung và chọn Phân tích để xem kết quả.
        </p>
      )}
    </section>
  )
}
