"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle,
  CircleNotch,
  Clock,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react"

/**
 * A stage the calling flow actually observes. Omit it when the caller cannot
 * see progress yet — the loader then shows no step list instead of inventing
 * a script of steps the backend never reported.
 */
export type LoadingStage = "CURATED_LOOKUP" | "AI_ANALYSIS"

/** Only these input types can escalate from the curated lists to the AI tier. */
const AI_ELIGIBLE_TYPES = new Set(["TEXT", "MESSAGE", "URL"])

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
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const resolvedType = (inputType || "").toUpperCase()
  // PHONE / DOMAIN / BANK_ACCOUNT consult the curated blacklist and whitelist
  // only — no AI council runs for them, so the copy must not promise one.
  const aiEligible = AI_ELIGIBLE_TYPES.has(resolvedType)

  const targetLabel =
    resolvedType === "PHONE"
      ? "số điện thoại"
      : resolvedType === "BANK_ACCOUNT"
        ? "số tài khoản"
        : resolvedType === "URL" || resolvedType === "DOMAIN"
          ? "đường dẫn liên kết"
          : "nội dung tin nhắn"

  const curatedStep = "Đối chiếu danh sách cảnh báo & danh bạ xác minh"
  const steps = aiEligible
    ? [curatedStep, "Chuyên gia AI phân tích chuyên sâu"]
    : [curatedStep]

  // -1 means the caller reported no stage, so nothing is highlighted.
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
      className="mt-6 w-full animate-in rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/50 p-6 shadow-xs duration-300 fade-in-50 dark:border-sky-900/50 dark:from-sky-950/30 dark:via-card dark:to-blue-950/20"
    >
      <div className="flex flex-col items-center space-y-4 text-center">
        {/* Emblem reflects the lookup the backend actually performs */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#008CC7] text-white shadow-md shadow-[#008CC7]/25">
          {aiEligible ? (
            <Sparkle
              size={28}
              weight="fill"
              className="animate-spin duration-3000"
            />
          ) : (
            <MagnifyingGlass size={28} weight="bold" />
          )}
        </div>

        {/* Honest headline: no council/AI wording for curated-only types */}
        <div className="max-w-lg space-y-1.5">
          <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
            {aiEligible
              ? `Đang đối chiếu danh sách cảnh báo cho ${targetLabel}`
              : "Đang tra cứu danh sách cảnh báo và danh bạ xác minh…"}
          </h3>
          <p className="text-xs font-semibold text-sky-800 dark:text-sky-300">
            {aiEligible
              ? "Đối chiếu danh sách cảnh báo trước — chỉ khi thật sự cần thiết mới chuyển sang bước chuyên gia AI phân tích chuyên sâu."
              : "Kết quả dựa trên danh sách cảnh báo và danh bạ tổ chức đã xác minh, không kèm phân tích AI."}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Thời gian chờ:{" "}
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {seconds}s
            </strong>
          </p>
        </div>

        {/* Steps come from the reported stage — never from a fixed script */}
        {activeIndex >= 0 && (
          <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 pt-2 text-left sm:grid-cols-2">
            {steps.map((step, index) => {
              const state =
                index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "pending"
              const rowClass =
                state === "done"
                  ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                  : state === "active"
                    ? "border-sky-300 bg-sky-100/70 dark:border-sky-800 dark:bg-sky-950/50"
                    : "border-slate-200/80 bg-slate-50/70 opacity-75 dark:border-border dark:bg-muted/30"
              const titleClass =
                state === "done"
                  ? "text-emerald-900 dark:text-emerald-200"
                  : state === "active"
                    ? "text-sky-950 dark:text-sky-100"
                    : "text-slate-700 dark:text-slate-300"
              const subClass =
                state === "done"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : state === "active"
                    ? "text-sky-800 dark:text-sky-300"
                    : "text-slate-500 dark:text-slate-400"

              return (
                <div
                  key={step}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs shadow-2xs ${rowClass}`}
                >
                  {state === "done" ? (
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : state === "active" ? (
                    <CircleNotch
                      size={18}
                      className="shrink-0 animate-spin text-[#008CC7] dark:text-sky-400"
                    />
                  ) : (
                    <Clock
                      size={18}
                      className="shrink-0 text-slate-400 dark:text-slate-500"
                    />
                  )}
                  <div>
                    <p className={`font-bold ${titleClass}`}>{step}</p>
                    <p className={`text-[10px] ${subClass}`}>
                      {state === "done"
                        ? "Đã hoàn tất"
                        : state === "active"
                          ? "Đang thực hiện"
                          : "Chờ tới lượt"}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Animated pulse bar */}
        <div className="mt-2 h-1 w-full max-w-md overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[#008CC7]" />
        </div>
      </div>
    </div>
  )
}
