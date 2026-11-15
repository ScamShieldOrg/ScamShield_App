"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Sparkle,
  ShieldCheck,
  WarningCircle,
  Clock,
  ArrowClockwise,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { ScamCheckInput } from "./scam-check-input"
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

// `ScamCheckInput` requires one entry per tab, not a sparse record.
const EMPTY_DRAFTS: Record<CheckType, string> = {
  TEXT: "",
  URL: "",
  PHONE: "",
  BANK_ACCOUNT: "",
}

function resetTime(value: string) {
  const date = new Date(`${value}+07:00`)
  if (Number.isNaN(date.getTime())) return "00:00 giờ Việt Nam"
  return `${new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date)} (giờ Việt Nam)`
}

export function GuestScamCheck() {
  const [activeTab, setActiveTab] = useState<CheckType>("TEXT")
  // One draft per tab so switching type never discards what the user typed.
  const [drafts, setDrafts] = useState<Partial<Record<CheckType, string>>>({})
  // The exact text that produced the displayed scan, so the report prefill can
  // quote it back even after the user edits or clears the draft.
  const [submittedContent, setSubmittedContent] = useState("")
  const inputType = toGuestInputType(activeTab)

  const {
    phase,
    quota,
    result,
    error,
    quotaError,
    lastSubmittedType,
    // Measured inside the hook, around the scan request only.
    executionTimeMs,
    submit,
    refreshQuota,
  } = useGuestScamCheck(inputType)

  const busy = phase !== "idle" && phase !== "initializing"
  const exhausted = quota?.remaining === 0 && !quotaError

  const handleDraftChange = (type: CheckType, value: string) => {
    setDrafts((previous) => ({ ...previous, [type]: value }))
  }

  // `ScamCheckInput` expects a complete record, not a sparse one.
  const draftMap: Record<CheckType, string> = { ...EMPTY_DRAFTS, ...drafts }

  const handleAnalyze = async (content: string, type: CheckType) => {
    setActiveTab(type)
    const trimmed = content.trim()
    setSubmittedContent(trimmed)
    // The hook measures the scan request itself; timing it here would also
    // count the quota refresh that runs after the result is written.
    await submit({
      inputType: toGuestInputType(type),
      content: trimmed,
    })
  }

  // Transform backend result to CheckScanResponse for Advisory UI components.
  // The type must be the one that actually produced this scan, not the live tab.
  const resultInputType = lastSubmittedType ?? inputType
  const mappedResult: CheckScanResponse | null = useMemo(() => {
    if (!result) return null
    return mapBackendDtoToScanResponse(result, executionTimeMs, resultInputType)
  }, [result, executionTimeMs, resultInputType])

  // A phone number, link or account number is itself the identifier; free-form
  // message text is not, so the report prefill leaves it empty.
  const targetIdentifier =
    resultInputType === "MESSAGE" ? null : submittedContent || null

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-12">
      {/* Header Pill */}
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
        <Sparkle aria-hidden="true" weight="fill" className="text-amber-500" />
        <span>Phân tích nội dung & Xác minh nguồn tin đáng ngờ</span>
      </div>

      <h1 className="mb-4 text-center text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl">
        Kiểm tra trước khi tin tưởng
        <br />
        Bảo vệ bạn khỏi lừa đảo số
      </h1>
      <p className="mb-8 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
        Đối chiếu tin nhắn SMS, liên kết website lạ hoặc số điện thoại khả nghi
        với danh sách cảnh báo và danh bạ xác minh; tin nhắn và liên kết đáng
        ngờ sẽ được phân tích chuyên sâu thêm.
      </p>

      {/* Guest Quota Bar */}
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-xs text-card-foreground shadow-2xs">
        <div className="flex items-center gap-2">
          <Clock
            size={16}
            weight="bold"
            className="text-sky-600 dark:text-sky-400"
          />
          <span>
            {quota ? (
              <>
                Lượt kiểm tra miễn phí hôm nay:{" "}
                <strong
                  className={
                    quota.remaining === 0
                      ? "font-bold text-rose-600"
                      : "font-bold text-emerald-600"
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
              "Đang tải hạn mức kiểm tra..."
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {quota && quota.remaining <= 1 && (
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Đăng nhập để nhận thêm lượt
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void refreshQuota()}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowClockwise size={14} className={busy ? "animate-spin" : ""} />
            <span>Cập nhật</span>
          </Button>
        </div>
      </div>

      {/* Quota Exhausted Warning */}
      {exhausted && (
        <div
          role="alert"
          className="mb-6 flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <WarningCircle
            size={20}
            weight="fill"
            className="shrink-0 text-amber-600"
          />
          <div className="flex-1 space-y-1">
            <p className="font-bold">
              Đã sử dụng hết hạn mức kiểm tra của Khách:
            </p>
            <p className="leading-relaxed">
              Bạn đã sử dụng hết lượt kiểm tra vãng lai trong ngày. Hãy{" "}
              <Link href="/login" className="font-bold underline">
                Đăng nhập
              </Link>{" "}
              hoặc{" "}
              <Link href="/register" className="font-bold underline">
                Đăng ký tài khoản
              </Link>{" "}
              để tiếp tục kiểm tra với hạn mức cao hơn.
            </p>
          </div>
        </div>
      )}

      {/* Quota Error / General Error */}
      {(quotaError || error) && (
        <div
          role="alert"
          className="mb-6 flex w-full items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <WarningCircle
            size={20}
            weight="fill"
            className="shrink-0 text-rose-600"
          />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Lỗi:</p>
            <p className="leading-relaxed">{error || quotaError}</p>
          </div>
        </div>
      )}

      {/* Main Form Input */}
      <div className="w-full">
        <ScamCheckInput
          activeTab={activeTab}
          onTabChange={setActiveTab}
          drafts={draftMap}
          onDraftChange={handleDraftChange}
          onAnalyze={handleAnalyze}
          isLoading={busy}
          quotaExhausted={exhausted}
        />
      </div>

      {/* Loading indicator: no stage is passed, so no step list is invented. */}
      {busy && <Tier2LoadingIndicator inputType={resultInputType} />}

      {/* Analysis Result (Advisory UI) */}
      {mappedResult && (
        <div
          aria-live="polite"
          className="w-full animate-in space-y-6 pt-6 duration-300 fade-in-50"
        >
          {/* Verdict Banner */}
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
          />

          {/* Evidence Card */}
          <ScamEvidenceCard data={mappedResult} />

          {/* Bottom Action Bar */}
          <ScamActionBar
            scanId={mappedResult.scan_id}
            checkId={mappedResult.check_id}
            mode="guest"
            inputType={mappedResult.input_type}
            targetIdentifier={targetIdentifier}
            reportedMessage={submittedContent || null}
            description={mappedResult.verdict.summary}
          />
        </div>
      )}

      {/* Initial Empty State */}
      {!mappedResult && !busy && !error && (
        <div className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center dark:border-border dark:bg-card/40">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-[#008CC7] dark:bg-primary/20 dark:text-primary">
            <ShieldCheck size={26} weight="duotone" />
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
    </section>
  )
}
