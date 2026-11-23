"use client"

import { useEffect, useRef, useState } from "react"
import { LockSimple } from "@phosphor-icons/react"
import { useUserScamCheck } from "@/features/check/hooks/use-user-scam-check"
import { ScamCheckInput } from "./scam-check-input"
import { ScamQuotaStrip } from "./scam-quota-strip"
import { ScamErrorCallout } from "./scam-error-callout"
import { Tier2LoadingIndicator } from "./tier2-loading-indicator"
import { ScamVerdictBanner } from "./scam-verdict-banner"
import { ScamEvidenceCard } from "./scam-evidence-card"
import { ScamActionBar } from "./scam-action-bar"

export function UserScamCheck() {
  const {
    inputType,
    result,
    error,
    isLoading,
    lastSubmittedType,
    lastSubmittedContent,
    isResultStale,
    quota,
    quotaExhausted,
    quotaLoading,
    quotaError,
    refreshQuota,
    drafts,
    changeType,
    changeDraft,
    clearResult,
    analyze,
    retry,
  } = useUserScamCheck()

  const [focusSignal, setFocusSignal] = useState(0)
  const resultAnchorRef = useRef<HTMLDivElement>(null)

  const resultType = lastSubmittedType ?? inputType
  const targetIdentifier =
    resultType === "TEXT" ? null : lastSubmittedContent || null

  useEffect(() => {
    if (!result) return
    resultAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [result])

  const handleReset = () => {
    clearResult()
    changeDraft(inputType, "")
    setFocusSignal((prev) => prev + 1)
  }

  const activeError = error || quotaError

  return (
    <div className="space-y-4">
      {/* Compact Single-Line Quota Strip */}
      <ScamQuotaStrip
        mode="user"
        quota={quota}
        isLoading={quotaLoading}
        isBusy={isLoading}
        error={quotaError}
        onRefresh={() => void refreshQuota()}
      />

      {/* Unified Single-Surface Composer */}
      <ScamCheckInput
        activeTab={inputType}
        onTabChange={changeType}
        drafts={drafts}
        onDraftChange={changeDraft}
        onAnalyze={analyze}
        isLoading={isLoading}
        quotaExhausted={quotaExhausted}
        focusSignal={focusSignal}
      />

      {/* Quiet Minimal Privacy Note When Idle */}
      {!result && !isLoading && !activeError && (
        <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <LockSimple
            aria-hidden="true"
            size={14}
            weight="bold"
            className="shrink-0"
          />
          <span>
            Nội dung được đối chiếu bảo mật. Hỗ trợ dán nhanh và chuyển tab tự
            động theo định dạng.
          </span>
        </p>
      )}

      {/* Honest Loading Progress Surface */}
      {isLoading && <Tier2LoadingIndicator inputType={resultType} />}

      {/* Recoverable Error Callout (Preserves User Input) */}
      {!isLoading && activeError && (
        <ScamErrorCallout
          title={
            error
              ? "Chưa thể hoàn tất kiểm tra"
              : "Chưa thể tải hạn mức kiểm tra"
          }
          message={activeError}
          preserveDraftHint={Boolean(error)}
          onRetry={error ? retry : undefined}
          onRefreshQuota={quotaError ? () => void refreshQuota() : undefined}
          isBusy={isLoading || quotaLoading}
        />
      )}

      {/* Progressive 3-Tier Verdict Flow */}
      {result && !isLoading && (
        <div
          ref={resultAnchorRef}
          aria-live="polite"
          className="space-y-4 pt-2"
        >
          <ScamVerdictBanner
            verdict={result.verdict}
            provenance={result.execution_provenance}
            executionTimeMs={result.execution_time_ms}
            modelName={result.engine_details?.model_name}
            features={result.deterministic_features}
            targetBank={result.target_bank}
            inputType={result.input_type}
            matchedIndicator={result.matched_indicator}
            decidedByStage={result.decided_by_stage}
            mode="user"
            checkedContent={lastSubmittedContent}
            isStale={isResultStale}
          />

          <ScamEvidenceCard data={result} />

          <ScamActionBar
            scanId={result.scan_id}
            checkId={result.check_id}
            mode="user"
            inputType={result.input_type}
            targetIdentifier={targetIdentifier}
            reportedMessage={lastSubmittedContent || null}
            description={result.verdict.summary}
            riskLevel={result.verdict.risk_level}
            onReset={handleReset}
          />
        </div>
      )}
    </div>
  )
}
