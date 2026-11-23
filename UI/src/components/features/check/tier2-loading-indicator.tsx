"use client"

import { useEffect, useState } from "react"
import { CheckCircle, CircleNotch, Clock } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/**
 * A stage the calling flow actually observes. Omit it when the caller cannot
 * see backend progress yet so the UI stays honest and never fabricates steps.
 */
export type LoadingStage = "CURATED_LOOKUP" | "AI_ANALYSIS"

const AI_ELIGIBLE_TYPES = new Set(["TEXT", "MESSAGE"])

interface Tier2LoadingIndicatorProps {
  inputType?: string
  stage?: LoadingStage
}

export function Tier2LoadingIndicator({
  inputType = "TEXT",
  stage,
}: Tier2LoadingIndicatorProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const resolvedType = (inputType || "").toUpperCase()
  const aiEligible = AI_ELIGIBLE_TYPES.has(resolvedType)

  const headline =
    resolvedType === "PHONE"
      ? "Đang tra cứu số điện thoại…"
      : resolvedType === "BANK_ACCOUNT"
        ? "Đang tra cứu số tài khoản ngân hàng…"
        : resolvedType === "URL" || resolvedType === "DOMAIN"
          ? "Đang kiểm tra độ an toàn của đường dẫn…"
          : "Đang phân tích nội dung tin nhắn…"

  const subtitle = (() => {
    if (!aiEligible) {
      return "Hệ thống đang đối chiếu trực tiếp với danh sách cảnh báo và danh bạ tổ chức đã xác minh."
    }
    if (seconds >= 5) {
      return "Nội dung cần đối soát chuyên sâu đa chiều nên có thể mất khoảng 5–15 giây. Vui lòng giữ nguyên trang."
    }
    return "Đang đối chiếu danh sách cảnh báo và đánh giá các dấu hiệu rủi ro trong nội dung."
  })()

  // Only show a step list when the caller passes a real observed backend stage.
  const steps = aiEligible
    ? [
        "Đối chiếu danh sách cảnh báo & danh bạ xác minh",
        "Phân tích chuyên sâu từ chuyên gia AI",
      ]
    : ["Đối chiếu danh sách cảnh báo & danh bạ xác minh"]

  const activeIndex =
    stage === "AI_ANALYSIS" && aiEligible
      ? 1
      : stage === "CURATED_LOOKUP"
        ? 0
        : -1

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-opacity duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300">
            <CircleNotch
              aria-hidden="true"
              size={20}
              weight="bold"
              className="motion-safe:animate-spin"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-heading text-sm font-semibold tracking-[-0.01em] text-foreground">
              {headline}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        <span
          aria-label={`Đã chờ ${seconds} giây`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-medium text-muted-foreground tabular-nums dark:border-white/10"
        >
          <Clock aria-hidden="true" size={13} weight="bold" />
          <span>{seconds}s</span>
        </span>
      </div>

      {/* Smooth GPU-only indeterminate progress track */}
      <div
        aria-hidden="true"
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full w-full origin-left rounded-full bg-primary/75 motion-safe:animate-pulse" />
      </div>

      {/* Reported stages only — never fabricated */}
      {activeIndex >= 0 && (
        <div className="divide-y divide-border/70 border-t border-border/70 pt-2">
          {steps.map((step, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending"

            return (
              <div
                key={step}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  {state === "done" ? (
                    <CheckCircle
                      aria-hidden="true"
                      size={16}
                      weight="fill"
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : state === "active" ? (
                    <CircleNotch
                      aria-hidden="true"
                      size={16}
                      weight="bold"
                      className="shrink-0 text-primary motion-safe:animate-spin"
                    />
                  ) : (
                    <Clock
                      aria-hidden="true"
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      state === "pending"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {step}
                  </span>
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {state === "done"
                    ? "Hoàn tất"
                    : state === "active"
                      ? "Đang xử lý"
                      : "Chờ"}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
