"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, MotionConfig } from "motion/react"
import { ArrowLeft, CalendarBlank, Hash } from "@phosphor-icons/react"
import {
  getScamCheckResult,
  mapBackendDtoToScanResponse,
} from "@/features/check/services/check.service"
import type { ScamCheckResult } from "@/features/check/types/scam-check.types"
import { ScamVerdictBanner } from "@/components/features/check/scam-verdict-banner"
import { ScamEvidenceCard } from "@/components/features/check/scam-evidence-card"
import { ScamActionBar } from "@/components/features/check/scam-action-bar"
import { ScamErrorCallout } from "@/components/features/check/scam-error-callout"
import { formatHistoryDateTime } from "./history-helpers"

function HistoryDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải chi tiết kết quả kiểm tra"
      className="space-y-4"
    >
      <div className="rounded-xl border border-black/10 bg-card p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)] dark:border-white/10 dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]">
        <div className="motion-safe:animate-pulse space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-40 rounded-md bg-muted" />
              <div className="h-7 w-64 rounded-md bg-muted" />
            </div>
            <div className="size-20 shrink-0 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-full max-w-[54ch] rounded-md bg-muted/80" />
          <div className="h-4 w-3/4 max-w-[44ch] rounded-md bg-muted/60" />
          <div className="border-t border-border/70 pt-4">
            <div className="h-4 w-36 rounded-md bg-muted" />
            <div className="mt-2.5 space-y-2">
              <div className="h-3.5 w-full rounded-md bg-muted/70" />
              <div className="h-3.5 w-5/6 rounded-md bg-muted/70" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-card p-5 dark:border-white/10">
        <div className="motion-safe:animate-pulse space-y-3">
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-muted" />
            <div className="h-9 w-32 rounded-lg bg-muted/70" />
            <div className="h-9 w-28 rounded-lg bg-muted/70" />
          </div>
          <div className="h-24 w-full rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  )
}

export function UserHistoryDetail({ checkId }: { checkId: number }) {
  const isValidId = Number.isSafeInteger(checkId) && checkId > 0
  const [retryKey, setRetryKey] = useState(0)
  const [result, setResult] = useState<ScamCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestKey = `${checkId}|${retryKey}`
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(
    null
  )
  const isLoading = isValidId && settledRequestKey !== requestKey

  useEffect(() => {
    if (!isValidId) return
    let active = true

    getScamCheckResult(checkId)
      .then((value) => {
        if (!active) return
        setResult(value)
        setError(null)
        setSettledRequestKey(requestKey)
      })
      .catch((err) => {
        if (!active) return
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Không thể tải kết quả. Bản ghi có thể đã hết hạn lưu trữ hoặc bạn không có quyền xem."
        setResult(null)
        setError(message)
        setSettledRequestKey(requestKey)
      })

    return () => {
      active = false
    }
  }, [checkId, isValidId, requestKey])

  const scanResponse = useMemo(() => {
    if (!result) return null
    try {
      return mapBackendDtoToScanResponse(result, 0)
    } catch {
      return null
    }
  }, [result])

  const formattedCreatedAt = formatHistoryDateTime(
    result?.completedAt || result?.createdAt
  )

  const targetIdentifier =
    result?.matchedIndicator?.value ||
    (scanResponse?.deterministic_features?.phone_analysis?.detected_phones?.[0] ??
      scanResponse?.deterministic_features?.url_analysis?.detected_urls?.[0] ??
      null)

  const normalizedInputType = (result?.inputType || "").toUpperCase()

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto max-w-3xl space-y-6 font-sans antialiased">
        {/* Top Navigation & Metadata Header */}
        <header className="space-y-3">
          <Link
            href="/user/history"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-card px-4 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/10"
          >
            <ArrowLeft aria-hidden="true" size={15} weight="bold" />
            <span>Quay lại lịch sử kiểm tra</span>
          </Link>

          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground">
              Chi tiết kết quả kiểm tra
            </h1>
            {isValidId && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Hash aria-hidden="true" size={14} weight="bold" />
                  <span>Mã tra cứu: #{checkId}</span>
                </span>
                {formattedCreatedAt && (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <CalendarBlank aria-hidden="true" size={14} weight="bold" />
                    <span>Kiểm tra lúc: {formattedCreatedAt}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Invalid ID or Fetch Error */}
        <AnimatePresence initial={false}>
          {!isValidId && (
            <ScamErrorCallout
              key="invalid-id"
              title="Mã kết quả kiểm tra không hợp lệ"
              message="Đường dẫn bạn đang truy cập không chứa mã tra cứu hợp lệ. Vui lòng chọn một mục từ danh sách lịch sử."
              preserveDraftHint={false}
            />
          )}

          {isValidId && error && (
            <ScamErrorCallout
              key="fetch-error"
              title="Không thể tải chi tiết kết quả"
              message={error}
              preserveDraftHint={false}
              onRetry={() => {
                setError(null)
                setRetryKey((prev) => prev + 1)
              }}
              isBusy={isLoading}
            />
          )}

          {isValidId && !isLoading && !error && result && !scanResponse && (
            <ScamErrorCallout
              key="map-error"
              title="Dữ liệu kết quả không đầy đủ"
              message="Hệ thống không thể hiển thị chi tiết cho bản ghi này. Vui lòng thử tải lại."
              preserveDraftHint={false}
              onRetry={() => setRetryKey((prev) => prev + 1)}
              isBusy={isLoading}
            />
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && <HistoryDetailSkeleton />}

        {/* Unified Verdict + Evidence + Action Bar */}
        {!isLoading && scanResponse && (
          <div className="scroll-mt-24 space-y-5">
            <ScamVerdictBanner
              verdict={scanResponse.verdict}
              provenance={scanResponse.execution_provenance}
              modelName={scanResponse.engine_details?.model_name}
              features={scanResponse.deterministic_features ?? undefined}
              inputType={normalizedInputType || "TEXT"}
              matchedIndicator={scanResponse.matched_indicator ?? null}
              decidedByStage={scanResponse.decided_by_stage}
              mode="user"
              actionableSteps={scanResponse.actionable_steps}
              scanId={scanResponse.scan_id}
            />

            <ScamEvidenceCard data={scanResponse} />

            <ScamActionBar
              scanId={scanResponse.scan_id}
              checkId={scanResponse.check_id || checkId}
              mode="user"
              inputType={normalizedInputType || "TEXT"}
              targetIdentifier={targetIdentifier}
              description={scanResponse.verdict.summary}
              riskLevel={scanResponse.verdict.risk_level}
            />
          </div>
        )}
      </section>
    </MotionConfig>
  )
}
