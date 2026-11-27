"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  CheckCircle,
  CursorClick,
  LinkSimple,
  Phone,
  WarningCircle,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type {
  DeterministicFeatures,
  RiskLevel,
} from "@/features/check/types/check.types"
import {
  buildAnnotatedSegments,
  type AnnotatedSegment,
  type AnnotationKind,
} from "./scam-input-helpers"

interface ScamAnnotatedMessageProps {
  rawText: string
  features?: DeterministicFeatures
  riskLevel?: RiskLevel
}

function getHighlightStyle(kind: Exclude<AnnotationKind, "plain">) {
  switch (kind) {
    case "url_danger":
      return {
        chip: "border-b-2 border-rose-500/70 bg-rose-500/12 text-rose-900 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/30",
        activeRing: "ring-2 ring-rose-500/50",
        card: "border-rose-500/25 bg-rose-500/8 text-rose-950 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-100",
        dot: "bg-rose-600 dark:bg-rose-400",
        Icon: LinkSimple,
      }
    case "url_safe":
      return {
        chip: "border-b-2 border-emerald-500/70 bg-emerald-500/12 text-emerald-900 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-200",
        activeRing: "ring-2 ring-emerald-500/50",
        card: "border-emerald-500/25 bg-emerald-500/8 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-100",
        dot: "bg-emerald-600 dark:bg-emerald-400",
        Icon: CheckCircle,
      }
    case "phone_hotline":
      return {
        chip: "border-b-2 border-emerald-500/70 bg-emerald-500/12 text-emerald-900 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-200",
        activeRing: "ring-2 ring-emerald-500/50",
        card: "border-emerald-500/25 bg-emerald-500/8 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-100",
        dot: "bg-emerald-600 dark:bg-emerald-400",
        Icon: Phone,
      }
    case "phone_personal":
      return {
        chip: "border-b-2 border-amber-500/80 bg-amber-500/14 text-amber-950 hover:bg-amber-500/24 dark:bg-amber-500/20 dark:text-amber-200",
        activeRing: "ring-2 ring-amber-500/50",
        card: "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100",
        dot: "bg-amber-500 dark:bg-amber-400",
        Icon: Phone,
      }
    case "urgency":
    case "token_risk":
    default:
      return {
        chip: "border-b-2 border-amber-500/75 bg-amber-500/12 text-amber-950 hover:bg-amber-500/22 dark:bg-amber-500/20 dark:text-amber-200",
        activeRing: "ring-2 ring-amber-500/50",
        card: "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100",
        dot: "bg-amber-500 dark:bg-amber-400",
        Icon: WarningCircle,
      }
  }
}

export function ScamAnnotatedMessage({
  rawText,
  features,
  riskLevel,
}: ScamAnnotatedMessageProps) {
  const segments = useMemo(
    () => buildAnnotatedSegments(rawText, features, riskLevel),
    [rawText, features, riskLevel]
  )

  const interactiveSegments = useMemo(
    () => segments.filter((seg) => seg.kind !== "plain"),
    [segments]
  )

  const [selectedId, setSelectedId] = useState<string | null>(
    () => interactiveSegments[0]?.id ?? null
  )

  const activeSegment: AnnotatedSegment | null =
    interactiveSegments.find((seg) => seg.id === selectedId) ?? null

  if (!rawText.trim()) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Nội dung đã kiểm tra
        </span>
        {interactiveSegments.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <CursorClick aria-hidden="true" size={13} weight="bold" />
            <span>
              {interactiveSegments.length} cụm từ nổi bật · bấm để xem lý do
            </span>
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/35 p-4 text-sm leading-7 break-words text-foreground dark:border-white/10 dark:bg-muted/20">
        {segments.map((seg) => {
          if (seg.kind === "plain") {
            return <span key={seg.id}>{seg.text}</span>
          }

          const style = getHighlightStyle(seg.kind)
          const isSelected = activeSegment?.id === seg.id

          return (
            <button
              key={seg.id}
              type="button"
              aria-expanded={isSelected}
              onClick={() => setSelectedId(isSelected ? null : seg.id)}
              className={cn(
                "mx-0.5 inline cursor-pointer rounded-sm px-1 py-0.5 text-left font-medium transition-[background-color,box-shadow] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                style.chip,
                isSelected && style.activeRing
              )}
            >
              {seg.text}
            </button>
          )
        })}
      </div>

      {/* Smooth interactive detail card for the selected highlighted phrase */}
      <AnimatePresence initial={false} mode="wait">
        {activeSegment && activeSegment.kind !== "plain" && (
          <motion.div
            key={activeSegment.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs",
              getHighlightStyle(activeSegment.kind).card
            )}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    getHighlightStyle(activeSegment.kind).dot
                  )}
                />
                <span className="font-semibold">{activeSegment.label}</span>
                <code className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {activeSegment.text}
                </code>
              </div>
              <p className="max-w-[65ch] text-xs leading-relaxed opacity-90">
                {activeSegment.reason}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Đóng giải thích cụm từ"
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-70 transition-opacity duration-120 hover:bg-background/40 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
