"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { LockSimple } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useScamCheckTheme } from "./scam-check-theme"
import { ScamHeroHeader } from "./scam-hero-header"
import { ScamSubmittedBubble } from "./scam-submitted-bubble"
import { ScamCheckInput } from "./scam-check-input"
import { ScamQuotaStrip } from "./scam-quota-strip"
import { ScamErrorCallout } from "./scam-error-callout"
import { ScamVerdictBanner } from "./scam-verdict-banner"
import { ScamEvidenceCard } from "./scam-evidence-card"
import { Tier2LoadingIndicator } from "./tier2-loading-indicator"
import { ScamActionBar } from "./scam-action-bar"
import { ScamTwoTierBar } from "./scam-two-tier-bar"
import { useGuestScamCheck } from "@/features/check/hooks/use-guest-scam-check"
import { mapBackendDtoToScanResponse } from "@/features/check/services/check.service"
import type {
  CheckScanResponse,
  CheckType,
} from "@/features/check/types/check.types"
import type { GuestInputType } from "@/features/check/types/guest-check.types"

interface GuestScamCheckProps {
  /** Content displayed beneath the hero only while idle (hidden during active scan/verdict). */
  idleFooter?: ReactNode
}

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

export function GuestScamCheck({ idleFooter }: GuestScamCheckProps) {
  const [activeTab, setActiveTab] = useState<CheckType>("TEXT")
  const [drafts, setDrafts] = useState<Partial<Record<CheckType, string>>>({})
  const [focusSignal, setFocusSignal] = useState(0)
  const resultAnchorRef = useRef<HTMLDivElement>(null)
  const { theme } = useScamCheckTheme()

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

  const activeError = error || quotaError
  const hasActiveView = Boolean(busy || mappedResult || (error && !exhausted))

  useEffect(() => {
    if (!mappedResult && !busy) return
    resultAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [mappedResult, busy])

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

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full">
        <section className="relative w-full overflow-x-clip">

          <div
            className={cn(
              "relative mx-auto flex w-full max-w-4xl flex-col px-4 pb-8 sm:px-6 lg:px-8",
              hasActiveView
                ? "min-h-[calc(100vh-5.5rem)] pt-5"
                : "pt-10 sm:pt-14"
            )}
          >
            {/* Active Result Stage ABOVE the Composer (Single Result Dock) */}
            <AnimatePresence mode="wait">
              {hasActiveView && (
                <motion.div
                  key="guest-active-stage"
                  ref={resultAnchorRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 space-y-4 pb-8"
                >
                  <ScamSubmittedBubble
                    inputType={resultInputType}
                    content={lastSubmittedContent}
                    onBackToHome={handleReset}
                    isLoading={busy}
                  />

                  <AnimatePresence mode="wait">
                    {busy && (
                      <Tier2LoadingIndicator
                        key="guest-loading"
                        inputType={resultInputType}
                      />
                    )}

                    {!busy && activeError && !exhausted && (
                      <ScamErrorCallout
                        key="guest-error"
                        title={
                          error
                            ? "Chưa thể hoàn tất kiểm tra"
                            : "Chưa thể tải hạn mức kiểm tra"
                        }
                        message={activeError}
                        preserveDraftHint={Boolean(error)}
                        onRetry={error ? handleRetry : undefined}
                        onRefreshQuota={
                          quotaError ? () => void refreshQuota() : undefined
                        }
                        isBusy={busy}
                      />
                    )}

                    {mappedResult && !busy && (
                      <div
                        key={mappedResult.scan_id}
                        aria-live="polite"
                        className="space-y-4"
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
                          actionableSteps={
                            mappedResult.actionable_steps ||
                            mappedResult.recommendations ||
                            []
                          }
                          scanId={mappedResult.scan_id}
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
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Idle Hero Header */}
            <AnimatePresence initial={false}>
              {!hasActiveView && (
                <motion.div
                  key="guest-hero"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ScamHeroHeader theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quota-only error when idle */}
            {!hasActiveView && quotaError && !busy && !exhausted && (
              <div className="mb-4">
                <ScamErrorCallout
                  title="Chưa thể tải hạn mức kiểm tra"
                  message={quotaError}
                  onRefreshQuota={() => void refreshQuota()}
                  isBusy={quotaLoading}
                />
              </div>
            )}

            {/* Composer: Centered when idle, smoothly slides down into Sticky Dock when active */}
            <motion.div
              layout="position"
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className={cn(
                "space-y-3",
                hasActiveView && "sticky bottom-4 z-30 mt-auto pt-2"
              )}
            >
              <ScamQuotaStrip mode="guest" quota={quota} error={quotaError} />

              <ScamCheckInput
                activeTab={activeTab}
                onTabChange={setActiveTab}
                drafts={draftMap}
                onDraftChange={handleDraftChange}
                onAnalyze={handleAnalyze}
                isLoading={busy}
                quotaExhausted={exhausted}
                focusSignal={focusSignal}
                quota={quota}
                quotaLoading={quotaLoading}
                quotaError={quotaError}
                onRefreshQuota={() => void refreshQuota()}
                showStarterChips={!hasActiveView}
                compact={hasActiveView}
                theme={theme}
              />

              {!hasActiveView && !quotaError && (
                <p className="flex items-center justify-center gap-2 pt-0.5 text-center text-xs text-muted-foreground">
                  <LockSimple
                    aria-hidden="true"
                    size={13}
                    weight="bold"
                    className="shrink-0"
                  />
                  <span>
                    Không cần đăng nhập · Tự nhận diện loại nội dung khi dán
                  </span>
                </p>
              )}
            </motion.div>

            {/* Slim 2-Tier Protection Bar (Idle Only) */}
            {!hasActiveView && (
              <div className="pt-7">
                <ScamTwoTierBar theme={theme} />
              </div>
            )}
          </div>
        </section>

        {/* Idle-only Footer Sections (hidden cleanly during active check/result) */}
        <AnimatePresence initial={false}>
          {!hasActiveView && idleFooter && (
            <motion.div
              key="guest-idle-footer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {idleFooter}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
