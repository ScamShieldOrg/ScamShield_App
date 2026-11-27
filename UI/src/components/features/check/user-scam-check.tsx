"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import {
  ClockCounterClockwise,
  LockSimple,
  SidebarSimple,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useUserScamCheck } from "@/features/check/hooks/use-user-scam-check"
import { useScamCheckTheme } from "./scam-check-theme"
import { ScamAmbientBackdrop } from "./scam-ambient-backdrop"
import { ScamHeroHeader } from "./scam-hero-header"
import { ScamSubmittedBubble } from "./scam-submitted-bubble"
import { ScamCheckInput } from "./scam-check-input"
import { ScamQuotaStrip } from "./scam-quota-strip"
import { ScamErrorCallout } from "./scam-error-callout"
import { Tier2LoadingIndicator } from "./tier2-loading-indicator"
import { ScamVerdictBanner } from "./scam-verdict-banner"
import { ScamEvidenceCard } from "./scam-evidence-card"
import { ScamActionBar } from "./scam-action-bar"
import { ScamTwoTierBar } from "./scam-two-tier-bar"
import { UserRecentChecksSidebar } from "./user-recent-checks-sidebar"

const RIGHT_SIDEBAR_STORAGE_KEY = "scamshield.check-recent-sidebar-collapsed"

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

  const { theme } = useScamCheckTheme()
  const [focusSignal, setFocusSignal] = useState(0)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [historyRefreshSignal, setHistoryRefreshSignal] = useState(0)
  const resultAnchorRef = useRef<HTMLDivElement>(null)
  const lastSeenScanIdRef = useRef<string | null>(null)

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      try {
        if (
          window.localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY) === "true"
        ) {
          setRightSidebarOpen(false)
        }
      } catch {
        // Ignore storage errors.
      }
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [])

  const toggleRightSidebar = () => {
    setRightSidebarOpen((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, String(!next))
      } catch {
        // Ignore storage errors.
      }
      return next
    })
  }

  const resultType = lastSubmittedType ?? inputType
  const targetIdentifier =
    resultType === "TEXT" ? null : lastSubmittedContent || null

  const activeError = error || quotaError
  const hasActiveView = Boolean(isLoading || result || error)

  useEffect(() => {
    if (!result && !isLoading) return
    resultAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [result, isLoading])

  // Refresh the right sidebar whenever a fresh scan completes.
  useEffect(() => {
    if (!result?.scan_id || result.scan_id === lastSeenScanIdRef.current) return
    lastSeenScanIdRef.current = result.scan_id
    const rafId = window.requestAnimationFrame(() => {
      setHistoryRefreshSignal((prev) => prev + 1)
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [result?.scan_id])

  const handleReset = () => {
    clearResult()
    changeDraft(inputType, "")
    setFocusSignal((prev) => prev + 1)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-0 w-full flex-1 overflow-hidden font-sans antialiased">
        {/* Inset Rounded Canvas (Railway-style frame surrounded by seamless Left Sidebar, Header & Right Sidebar) */}
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-t transition-colors duration-200 md:rounded-2xl md:border",
            theme.shellBg,
            theme.canvasFrameBorder
          )}
        >
          <ScamAmbientBackdrop
            theme={theme}
            className="flex flex-1 flex-col"
          >

          {/* Top-Right Utility Row: Right Sidebar Toggle (only when collapsed) */}
          {!rightSidebarOpen && (
            <div className="relative z-20 flex items-center justify-end px-4 pt-3.5 sm:px-6">
              <button
                type="button"
                onClick={toggleRightSidebar}
                title="Mở bảng Kiểm tra gần đây"
                className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-white/85 px-3 text-xs font-semibold text-foreground shadow-2xs backdrop-blur-md transition-colors duration-150 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:inline-flex dark:border-white/12 dark:bg-slate-900/80 dark:hover:bg-slate-900"
              >
                <ClockCounterClockwise
                  aria-hidden="true"
                  size={14}
                  weight="bold"
                  className={theme.heroPillIcon}
                />
                <span>Gần đây</span>
                <SidebarSimple
                  aria-hidden="true"
                  size={14}
                  weight="bold"
                  className="text-muted-foreground"
                />
              </button>
            </div>
          )}

          {/* Center Stage Container */}
          <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-5 sm:px-6 lg:px-8">
            {/* Active Result Stage ABOVE the Composer (Single Result Dock) */}
            <AnimatePresence mode="wait">
              {hasActiveView && (
                <motion.div
                  key="user-active-stage"
                  ref={resultAnchorRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 space-y-4 pt-3 pb-8"
                >
                  <ScamSubmittedBubble
                    inputType={resultType}
                    content={lastSubmittedContent}
                    onBackToHome={handleReset}
                    isLoading={isLoading}
                  />

                  <AnimatePresence mode="wait">
                    {isLoading && (
                      <Tier2LoadingIndicator
                        key="user-loading"
                        inputType={resultType}
                      />
                    )}

                    {!isLoading && activeError && (
                      <ScamErrorCallout
                        key="user-error"
                        title={
                          error
                            ? "Chưa thể hoàn tất kiểm tra"
                            : "Chưa thể tải hạn mức kiểm tra"
                        }
                        message={activeError}
                        preserveDraftHint={Boolean(error)}
                        onRetry={error ? retry : undefined}
                        onRefreshQuota={
                          quotaError ? () => void refreshQuota() : undefined
                        }
                        isBusy={isLoading || quotaLoading}
                      />
                    )}

                    {result && !isLoading && (
                      <div
                        key={result.scan_id}
                        aria-live="polite"
                        className="space-y-4"
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
                          actionableSteps={
                            result.actionable_steps ||
                            result.recommendations ||
                            []
                          }
                          scanId={result.scan_id}
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
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Centered Idle Block OR Bottom Sticky Dock */}
            <div
              className={cn(
                "flex flex-col",
                hasActiveView
                  ? "sticky bottom-4 z-30 mt-auto pt-2"
                  : "my-auto py-6"
              )}
            >
              {/* Idle Hero Header (vertically centered with Composer like Claude Web) */}
              <AnimatePresence initial={false}>
                {!hasActiveView && (
                  <motion.div
                    key="user-hero"
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
              {!hasActiveView && quotaError && !isLoading && (
                <div className="mb-4">
                  <ScamErrorCallout
                    title="Chưa thể tải hạn mức kiểm tra"
                    message={quotaError}
                    onRefreshQuota={() => void refreshQuota()}
                    isBusy={quotaLoading}
                  />
                </div>
              )}

              {/* Composer: slides smoothly into Sticky Dock when active */}
              <motion.div
                layout="position"
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                className="space-y-3"
              >
                <ScamQuotaStrip mode="user" quota={quota} error={quotaError} />

                <ScamCheckInput
                  activeTab={inputType}
                  onTabChange={changeType}
                  drafts={drafts}
                  onDraftChange={changeDraft}
                  onAnalyze={analyze}
                  isLoading={isLoading}
                  quotaExhausted={quotaExhausted}
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
                      Tự nhận diện Tin nhắn / URL / SĐT / Tài khoản khi dán ·
                      Lịch sử kiểm tra được lưu tự động
                    </span>
                  </p>
                )}
              </motion.div>
            </div>

            {/* Slim 2-Tier Protection Footer Bar (Idle Only, anchored at bottom) */}
            {!hasActiveView && (
              <div className="mt-auto pt-4">
                <ScamTwoTierBar theme={theme} />
              </div>
            )}
          </div>
          </ScamAmbientBackdrop>
        </div>

        {/* Right Foldable Sidebar (Seamless outer Railway chrome frame) */}
        <UserRecentChecksSidebar
          open={rightSidebarOpen}
          onToggle={toggleRightSidebar}
          refreshSignal={historyRefreshSignal}
          theme={theme}
        />
      </div>
    </MotionConfig>
  )
}
