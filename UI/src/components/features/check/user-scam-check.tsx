"use client"

import {
  ArrowClockwise,
  Clock,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useUserScamCheck } from "@/features/check/hooks/use-user-scam-check"
import { ScamCheckInput } from "./scam-check-input"
import { ScamVerdictBanner } from "./scam-verdict-banner"
import { ScamEvidenceCard } from "./scam-evidence-card"
import { Tier2LoadingIndicator } from "./tier2-loading-indicator"
import { ScamActionBar } from "./scam-action-bar"

function resetTime(value: string) {
  const date = new Date(`${value}+07:00`)
  if (Number.isNaN(date.getTime())) return "00:00 giờ Việt Nam"
  return `${new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} giờ Việt Nam`
}

export function UserScamCheck() {
  const {
    inputType,
    result,
    error,
    isLoading,
    lastSubmittedType,
    lastSubmittedContent,
    quota,
    quotaExhausted,
    quotaLoading,
    quotaError,
    refreshQuota,
    drafts,
    changeType,
    changeDraft,
    analyze,
  } = useUserScamCheck()

  // The verdict belongs to the type that produced it, not to the live tab.
  const resultType = lastSubmittedType ?? inputType
  // A phone number, link or account number is itself the identifier; free-form
  // message text is not, so the report prefill leaves it empty.
  const targetIdentifier =
    resultType === "TEXT" ? null : lastSubmittedContent || null

  return (
    <div className="space-y-6">
      {/* Daily quota for registered users; mirrors the sidebar quota card. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-xs text-card-foreground shadow-2xs">
        <div className="flex items-center gap-2">
          <Clock
            aria-hidden="true"
            size={16}
            weight="bold"
            className="text-sky-600 dark:text-sky-400"
          />
          <span>
            {quota ? (
              <>
                Lượt kiểm tra còn lại hôm nay:{" "}
                <strong
                  className={
                    quota.remaining <= 0
                      ? "font-bold text-rose-600 dark:text-rose-400"
                      : "font-bold text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {quota.remaining} / {quota.limit}
                </strong>
                {quota.resetsAt && (
                  <span className="ml-2 text-muted-foreground">
                    (Đặt lại lúc {resetTime(quota.resetsAt)})
                  </span>
                )}
              </>
            ) : (
              <span role="status" className="text-muted-foreground">
                {quotaLoading
                  ? "Đang tải hạn mức kiểm tra…"
                  : "Chưa có thông tin hạn mức"}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {quotaError && (
            <span role="status" className="text-[11px] text-destructive">
              {quotaError}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={quotaLoading || isLoading}
            onClick={() => void refreshQuota()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowClockwise
              aria-hidden="true"
              size={14}
              className={quotaLoading ? "animate-spin" : ""}
            />
            <span>Cập nhật</span>
          </Button>
        </div>
      </div>

      {/* Input Section: fully controlled, one draft per tab. */}
      <ScamCheckInput
        activeTab={inputType}
        onTabChange={changeType}
        drafts={drafts}
        onDraftChange={changeDraft}
        onAnalyze={analyze}
        isLoading={isLoading}
        quotaExhausted={quotaExhausted}
      />

      {/* Loading indicator: no stage is passed, so no step list is invented. */}
      {isLoading && <Tier2LoadingIndicator inputType={resultType} />}

      {/* Error Alert (validation, quota or API failure) */}
      {error && (
        <div
          role="alert"
          className="flex animate-in items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 duration-200 fade-in-50 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <WarningCircle
            aria-hidden="true"
            size={20}
            weight="fill"
            className="shrink-0 text-rose-600 dark:text-rose-400"
          />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Chưa thể hoàn tất kiểm tra:</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!result && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center dark:border-border dark:bg-card/40">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-[#008CC7] dark:bg-primary/20 dark:text-primary">
            <ShieldCheck aria-hidden="true" size={26} weight="duotone" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            Sẵn sàng kiểm tra nội dung
          </h3>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Nhập nội dung tin nhắn, đường dẫn website, số điện thoại hoặc số tài
            khoản ngân hàng đáng ngờ rồi bấm &ldquo;Phân tích&rdquo; để bắt đầu.
          </p>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div
          aria-live="polite"
          className="animate-in space-y-6 pt-2 duration-300 fade-in-50"
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
          />
        </div>
      )}
    </div>
  )
}
