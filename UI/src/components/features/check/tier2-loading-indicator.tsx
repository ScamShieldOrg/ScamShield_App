"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { CheckCircle, CircleNotch, Clock } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/**
 * A stage the calling flow actually observes. Omit it when the caller cannot
 * see backend progress yet so the UI stays honest and never fabricates steps.
 */
export type LoadingStage = "CURATED_LOOKUP" | "AI_ANALYSIS"

/** Only these input types can escalate from the curated lists to the AI tier. */
const AI_ELIGIBLE_TYPES = new Set(["TEXT", "MESSAGE"])

interface Tier2LoadingIndicatorProps {
  inputType?: string
  stage?: LoadingStage
}

export function Tier2LoadingIndicator({
  inputType = "TEXT",
  stage,
}: Tier2LoadingIndicatorProps) {
  const prefersReduced = useReducedMotion()
  const [seconds, setSeconds] = useState(0)
  const [tabVisible, setTabVisible] = useState(true)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    const onVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const resolvedType = (inputType || "").toUpperCase()
  const aiEligible = AI_ELIGIBLE_TYPES.has(resolvedType)

  const headline =
    resolvedType === "PHONE"
      ? "Đang tra cứu số điện thoại…"
      : resolvedType === "BANK_ACCOUNT"
        ? "Đang tra cứu số tài khoản…"
        : resolvedType === "URL" || resolvedType === "DOMAIN"
          ? "Đang kiểm tra đường dẫn…"
          : "Đang phân tích nội dung…"

  const subtitle = (() => {
    if (!aiEligible) {
      return "Đối chiếu trực tiếp với danh sách cảnh báo và danh bạ tổ chức xác minh."
    }
    if (seconds >= 5) {
      return "Các chuyên gia AI đang đối soát chuyên sâu đa chiều (thường mất 5–15 giây)."
    }
    return "Đang rà soát danh sách cảnh báo, đường dẫn và các dấu hiệu thao túng."
  })()

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
        : aiEligible
          ? (seconds >= 2 ? 1 : 0)
          : 0

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full space-y-4 overflow-hidden rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm dark:border-white/12 dark:shadow-[inset_0_1px_0_rgb(255,255,255,0.06)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-300">
            <div className="inline-flex motion-safe:animate-spin">
              <CircleNotch aria-hidden="true" size={18} weight="bold" />
            </div>
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

      {/* Smooth GPU-only Railway-style scanning beam (auto-pauses when tab is hidden) */}
      <div
        aria-hidden="true"
        className="relative h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        {prefersReduced || !tabVisible ? (
          <div className="h-full w-1/2 rounded-full bg-primary/60" />
        ) : (
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "400%" }}
            transition={{
              duration: 1.35,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        )}
      </div>

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
                    <div className="inline-flex shrink-0 motion-safe:animate-spin">
                      <CircleNotch
                        aria-hidden="true"
                        size={16}
                        weight="bold"
                        className="text-primary"
                      />
                    </div>
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
    </motion.div>
  )
}
