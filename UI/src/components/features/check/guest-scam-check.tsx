"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { LockSimple } from "@phosphor-icons/react"
import { ScamCheckInput } from "./scam-check-input"
import { ScamQuotaStrip } from "./scam-quota-strip"
import { ScamErrorCallout } from "./scam-error-callout"
import { ScamVerdictBanner } from "./scam-verdict-banner"
import { ScamEvidenceCard } from "./scam-evidence-card"
import { Tier2LoadingIndicator } from "./tier2-loading-indicator"
import { ScamActionBar } from "./scam-action-bar"
import { useGuestScamCheck } from "@/features/check/hooks/use-guest-scam-check"
import { mapBackendDtoToScanResponse } from "@/features/check/services/check.service"
import type {
  CheckScanResponse,
  CheckType,
} from "@/features/check/types/check.types"
import type { GuestInputType } from "@/features/check/types/guest-check.types"

// BANK_ACCOUNT is a real backend input type, so never fold it into MESSAGE.
function toGuestInputType(type: CheckType): GuestInputType {
  if (type === "URL" || type === "PHONE" || type === "BANK_ACCOUNT") return type
  return "MESSAGE"
}

const EMPTY_DRAFTS: Record<CheckType, string> = {
  TEXT: "",
  URL: "",
  PHONE: "",
  BANK_ACCOUNT: "",
}

export function GuestScamCheck() {
  const [activeTab, setActiveTab] = useState<CheckType>("TEXT")
  const [drafts, setDrafts] = useState<Partial<Record<CheckType, string>>>({})
  const [focusSignal, setFocusSignal] = useState(0)
  const resultAnchorRef = useRef<HTMLDivElement>(null)

  const inputType = toGuestInputType(activeTab)

  const {
    phase,
    quota,
    result,
    error,
    quotaError,
    lastSubmittedType,
    lastSubmittedContent,
    executionTimeMs,
    submit,
    refreshQuota,
    clearResult,
  } = useGuestScamCheck(inputType)

  const busy = phase !== "idle" && phase !== "initializing"
  const quotaLoading = phase === "initializing" || phase === "quota"
  const exhausted = quota?.remaining === 0 && !quotaError

  const handleDraftChange = (type: CheckType, value: string) => {
    setDrafts((previous) => ({ ...previous, [type]: value }))
  }

  const draftMap: Record<CheckType, string> = { ...EMPTY_DRAFTS, ...drafts }

  const handleAnalyze = async (content: string, type: CheckType) => {
    setActiveTab(type)
    await submit({
      inputType: toGuestInputType(type),
      content: content.trim(),
    })
  }

  const resultInputType = lastSubmittedType ?? inputType
  const mappedResult: CheckScanResponse | null = useMemo(() => {
    if (!result) return null
    return mapBackendDtoToScanResponse(
      result,
      executionTimeMs,
      resultInputType,
      lastSubmittedContent || undefined
    )
  }, [result, executionTimeMs, resultInputType, lastSubmittedContent])

  useEffect(() => {
    if (!mappedResult) return
    resultAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [mappedResult])

  const targetIdentifier =
    resultInputType === "MESSAGE" ? null : lastSubmittedContent || null

  const activeDraft = (draftMap[activeTab] ?? "").trim()
  const isResultStale = Boolean(
    mappedResult &&
      toGuestInputType(activeTab) === resultInputType &&
      activeDraft !== lastSubmittedContent.trim()
  )

  const handleRetry = () => {
    const contentToRetry = activeDraft || lastSubmittedContent.trim()
    if (!contentToRetry) return
    void submit({
      inputType: lastSubmittedType ?? inputType,
      content: contentToRetry,
    })
  }

  const handleReset = () => {
    clearResult()
    handleDraftChange(activeTab, "")
    setFocusSignal((prev) => prev + 1)
  }

  const activeError = error || quotaError

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-8 pb-10 sm:pt-12 sm:pb-12">
      {/* Focused Hero — Keeps Composer Above the Fold */}
      <header className="mb-6 space-y-2 text-center sm:mb-8">
        <h1 className="font-heading text-3xl leading-tight font-bold tracking-[-0.025em] text-balance text-foreground sm:text-4xl">
          Kiểm tra trước khi tin tưởng
        </h1>
        <p className="mx-auto max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
          Đối chiếu tin nhắn, liên kết lạ, số điện thoại hoặc số tài khoản ngân
          hàng với danh sách cảnh báo và phân tích AI chuyên sâu.
        </p>
      </header>

      <div className="space-y-4">
        {/* Compact Single-Line Quota Strip */}
        <ScamQuotaStrip
          mode="guest"
          quota={quota}
          isLoading={quotaLoading}
          isBusy={busy}
          error={quotaError}
          onRefresh={() => void refreshQuota()}
        />

        {/* Unified Single-Surface Composer */}
        <ScamCheckInput
          activeTab={activeTab}
          onTabChange={setActiveTab}
          drafts={draftMap}
          onDraftChange={handleDraftChange}
          onAnalyze={handleAnalyze}
          isLoading={busy}
          quotaExhausted={exhausted}
          focusSignal={focusSignal}
        />

        {/* Minimal Privacy & Shortcut Cue When Idle */}
        {!mappedResult && !busy && !activeError && (
          <p className="flex items-center justify-center gap-2 px-1 text-center text-xs text-muted-foreground">
            <LockSimple
              aria-hidden="true"
              size={14}
              weight="bold"
              className="shrink-0"
            />
            <span>
              Không cần đăng nhập để kiểm tra · Hỗ trợ dán nhanh & tự nhận diện
              định dạng.
            </span>
          </p>
        )}

        {/* Honest Loading Progress Surface */}
        {busy && <Tier2LoadingIndicator inputType={resultInputType} />}

        {/* Recoverable Error Callout */}
        {!busy && activeError && !exhausted && (
          <ScamErrorCallout
            title={
              error
                ? "Chưa thể hoàn tất kiểm tra"
                : "Chưa thể tải hạn mức kiểm tra"
            }
            message={activeError}
            preserveDraftHint={Boolean(error)}
            onRetry={error ? handleRetry : undefined}
            onRefreshQuota={quotaError ? () => void refreshQuota() : undefined}
            isBusy={busy}
          />
        )}

        {/* Progressive 3-Tier Verdict Flow */}
        {mappedResult && !busy && (
          <div
            ref={resultAnchorRef}
            aria-live="polite"
            className="space-y-4 pt-2"
          >
            <ScamVerdictBanner
              verdict={mappedResult.verdict}
              provenance={mappedResult.execution_provenance}
              executionTimeMs={mappedResult.execution_time_ms}
              modelName={mappedResult.engine_details?.model_name}
              features={mappedResult.deterministic_features}
              targetBank={mappedResult.target_bank}
              inputType={mappedResult.input_type}
              matchedIndicator={mappedResult.matched_indicator}
              decidedByStage={mappedResult.decided_by_stage}
              mode="guest"
              checkedContent={lastSubmittedContent}
              isStale={isResultStale}
            />

            <ScamEvidenceCard data={mappedResult} />

            <ScamActionBar
              scanId={mappedResult.scan_id}
              checkId={mappedResult.check_id}
              mode="guest"
              inputType={mappedResult.input_type}
              targetIdentifier={targetIdentifier}
              reportedMessage={lastSubmittedContent || null}
              description={mappedResult.verdict.summary}
              riskLevel={mappedResult.verdict.risk_level}
              onReset={handleReset}
            />
          </div>
        )}
      </div>
    </section>
  )
}
