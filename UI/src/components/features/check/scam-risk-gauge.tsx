"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  MagnifyingGlass,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/features/check/types/check.types"

interface ScamRiskGaugeProps {
  riskScore: number | null
  riskLevel: RiskLevel
  isCuratedLookup?: boolean
}

export function ScamRiskGauge({
  riskScore,
  riskLevel,
  isCuratedLookup = false,
}: ScamRiskGaugeProps) {
  const prefersReduced = useReducedMotion()
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    if (riskScore == null || prefersReduced) return
    let frame = 0
    const durationMs = 520
    const start = performance.now()
    const target = Math.max(0, Math.min(100, Math.round(riskScore)))

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / durationMs)
      // Exponential ease-out for crisp tactile deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(target * eased))
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick)
      }
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [riskScore, prefersReduced])

  const displayScore =
    riskScore == null
      ? 0
      : prefersReduced
        ? Math.max(0, Math.min(100, Math.round(riskScore)))
        : animatedScore

  const tone =
    riskLevel === "DANGEROUS"
      ? {
          stroke: "stroke-rose-600 dark:stroke-rose-400",
          text: "text-rose-700 dark:text-rose-400",
          glow: "bg-rose-500/12 dark:bg-rose-500/18",
          seal: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          zone: "Rủi ro cao",
        }
      : riskLevel === "SUSPICIOUS"
        ? {
            stroke: "stroke-amber-500 dark:stroke-amber-400",
            text: "text-amber-700 dark:text-amber-400",
            glow: "bg-amber-500/12 dark:bg-amber-500/18",
            seal: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            zone: "Cần cảnh giác",
          }
        : riskLevel === "SAFE"
          ? {
              stroke: "stroke-emerald-600 dark:stroke-emerald-400",
              text: "text-emerald-700 dark:text-emerald-400",
              glow: "bg-emerald-500/12 dark:bg-emerald-500/18",
              seal: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              zone: "Độ tin cậy cao",
            }
          : {
              stroke: "stroke-slate-500 dark:stroke-slate-400",
              text: "text-muted-foreground",
              glow: "bg-slate-500/10 dark:bg-slate-400/12",
              seal: "border-border bg-muted text-foreground",
              zone: "Chưa đủ căn cứ",
            }

  if (riskScore == null) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-2 py-2 text-center">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute size-20 rounded-full blur-2xl",
            tone.glow
          )}
        />
        <div
          className={cn(
            "relative flex size-14 items-center justify-center rounded-xl border",
            tone.seal
          )}
        >
          {riskLevel === "SAFE" ? (
            <ShieldCheck aria-hidden="true" size={28} weight="fill" />
          ) : riskLevel === "DANGEROUS" || riskLevel === "SUSPICIOUS" ? (
            <ShieldWarning aria-hidden="true" size={28} weight="fill" />
          ) : isCuratedLookup ? (
            <MagnifyingGlass aria-hidden="true" size={26} weight="bold" />
          ) : (
            <WarningCircle aria-hidden="true" size={28} weight="fill" />
          )}
        </div>
        <div className="relative space-y-0.5">
          <p className="text-xs font-semibold text-foreground">
            {isCuratedLookup ? "Đối chiếu danh bạ" : "Không chấm điểm"}
          </p>
          <p className={cn("text-xs font-medium", tone.text)}>{tone.zone}</p>
        </div>
      </div>
    )
  }

  const ratio = Math.max(0.03, Math.min(1, riskScore / 100))

  return (
    <div
      role="meter"
      aria-label="Chỉ số nguy cơ"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={riskScore}
      className="relative flex flex-col items-center justify-center"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1 size-24 rounded-full blur-2xl",
          tone.glow
        )}
      />

      <div className="relative flex flex-col items-center">
        <svg
          width="136"
          height="78"
          viewBox="0 0 136 78"
          fill="none"
          aria-hidden="true"
          className="overflow-visible"
        >
          {/* Track semicircle */}
          <path
            d="M 14 68 A 54 54 0 0 1 122 68"
            className="stroke-muted"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Animated value arc */}
          <motion.path
            d="M 14 68 A 54 54 0 0 1 122 68"
            className={tone.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ pathLength: prefersReduced ? ratio : 0 }}
            animate={{ pathLength: ratio }}
            transition={{
              type: "spring",
              stiffness: 110,
              damping: 20,
              mass: 0.8,
            }}
          />
        </svg>

        <div className="-mt-9 flex flex-col items-center text-center">
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span
              className={cn(
                "font-heading text-3xl leading-none font-bold tracking-[-0.03em]",
                tone.text
              )}
            >
              {displayScore}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              /100
            </span>
          </div>
          <span className="mt-1 text-xs font-semibold text-muted-foreground">
            {tone.zone}
          </span>
        </div>
      </div>
    </div>
  )
}
