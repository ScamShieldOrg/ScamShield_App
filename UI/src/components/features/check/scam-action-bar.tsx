"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowCounterClockwise,
  Check,
  FilePdf,
  Info,
  Megaphone,
  Scales,
  ShareNetwork,
  SignIn,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/features/check/types/check.types"

/**
 * Hand-off key between the check result action bar (writer) and the report
 * form (reader). Keep the two sides in sync.
 */
export const REPORT_PREFILL_KEY = "scamshield.report-prefill"

/** Payload stored in `sessionStorage` right before navigating to the report. */
export interface ReportPrefillDraft {
  scanId: string
  checkId: number
  inputType?: string | null
  targetIdentifier?: string | null
  reportedMessage?: string | null
  description?: string | null
  savedAt: string
}

/**
 * Hand-off key between the check result action bar (writer) and the dispute
 * form (reader). Keep the two sides in sync.
 */
export const DISPUTE_PREFILL_KEY = "scamshield.dispute-prefill"

/** Payload stored in `sessionStorage` right before navigating to the dispute. */
export interface DisputePrefillDraft {
  scanId: string
  checkId: number
  inputType?: string | null
  indicatorValue?: string | null
  savedAt: string
}

interface ScamActionBarProps {
  /** Backend AI scan id (`SCAN-...`), used in the deep-link query string. */
  scanId: string
  /** Numeric backend check id, needed to hydrate the report prefill. */
  checkId: number
  /** `guest` hides every `/user/...` action and offers sign-up instead. */
  mode: "guest" | "user"
  /** Optional context used to prefill the report form. */
  inputType?: string | null
  /** Optional checked target (phone number, link, bank account). */
  targetIdentifier?: string | null
  /** Optional raw content the user submitted to the checker. */
  reportedMessage?: string | null
  /** Optional short description derived from the real verdict. */
  description?: string | null
  /** Drives single-primary CTA weighting (e.g. elevate Report on high-risk scans). */
  riskLevel?: RiskLevel
  /** Optional callback for quick loop back to a fresh check. */
  onReset?: () => void
}

type ShareFeedback = { tone: "success" | "error"; message: string } | null

async function copyToClipboard(value: string) {
  try {
    if (typeof navigator.clipboard?.writeText !== "function") return false
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

const primaryActionClass =
  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-progress disabled:opacity-60"

const secondaryActionClass =
  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-2xs transition-[background-color,border-color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-progress disabled:opacity-60 dark:border-white/12"

const ghostActionClass =
  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-[color,background-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function ScamActionBar({
  scanId,
  checkId,
  mode,
  inputType = null,
  targetIdentifier = null,
  reportedMessage = null,
  description = null,
  riskLevel,
  onReset,
}: ScamActionBarProps) {
  const [sharing, setSharing] = useState(false)
  const [feedback, setFeedback] = useState<ShareFeedback>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    setFeedback(null)
    const url = window.location.href
    const shareData = {
      title: "Kết quả kiểm tra ScamShield",
      text: "Kết quả kiểm tra dấu hiệu lừa đảo trên ScamShield",
      url,
    }
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData)
        setFeedback({ tone: "success", message: "Đã mở bảng chia sẻ." })
        return
      }
      const copied = await copyToClipboard(url)
      setFeedback(
        copied
          ? { tone: "success", message: "Đã sao chép liên kết kết quả." }
          : {
              tone: "error",
              message:
                "Trình duyệt không cho phép sao chép tự động. Vui lòng sao chép liên kết trên thanh địa chỉ.",
            }
      )
    } catch (error) {
      if (isAbortError(error)) return
      const copied = await copyToClipboard(url)
      setFeedback(
        copied
          ? { tone: "success", message: "Đã sao chép liên kết kết quả." }
          : {
              tone: "error",
              message:
                "Không thể chia sẻ hoặc sao chép liên kết. Vui lòng thử lại.",
            }
      )
    } finally {
      setSharing(false)
    }
  }

  const handleReportClick = () => {
    if (mode !== "user") return
    const draft: ReportPrefillDraft = {
      scanId,
      checkId,
      inputType,
      targetIdentifier,
      reportedMessage,
      description,
      savedAt: new Date().toISOString(),
    }
    try {
      window.sessionStorage.setItem(REPORT_PREFILL_KEY, JSON.stringify(draft))
    } catch {
      // Private mode / quota errors: the report form still reads scanId from URL.
    }
  }

  const handleDisputeClick = () => {
    if (mode !== "user") return
    const draft: DisputePrefillDraft = {
      scanId,
      checkId,
      inputType,
      indicatorValue: targetIdentifier,
      savedAt: new Date().toISOString(),
    }
    try {
      window.sessionStorage.setItem(DISPUTE_PREFILL_KEY, JSON.stringify(draft))
    } catch {
      // Private mode / quota errors: the dispute page still reads scanId from URL.
    }
  }

  const handleExportPdf = () => {
    window.print()
  }

  const reportIsPrimary =
    mode === "user" &&
    (riskLevel === "DANGEROUS" || riskLevel === "SUSPICIOUS")

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "user" ? (
            <>
              <Link
                href={`/user/reports/new?scanId=${encodeURIComponent(scanId)}`}
                onClick={handleReportClick}
                className={
                  reportIsPrimary ? primaryActionClass : secondaryActionClass
                }
              >
                <Megaphone aria-hidden="true" size={15} weight="bold" />
                <span>
                  {reportIsPrimary ? "Báo cáo lừa đảo" : "Gửi báo cáo"}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={sharing}
                aria-busy={sharing}
                className={
                  reportIsPrimary ? secondaryActionClass : primaryActionClass
                }
              >
                <ShareNetwork aria-hidden="true" size={15} weight="bold" />
                <span>Chia sẻ</span>
              </button>

              <Link
                href={`/user/disputes?scanId=${encodeURIComponent(scanId)}`}
                onClick={handleDisputeClick}
                className={secondaryActionClass}
              >
                <Scales aria-hidden="true" size={15} weight="bold" />
                <span>Khiếu nại</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/register" className={primaryActionClass}>
                <UserPlus aria-hidden="true" size={15} weight="bold" />
                <span>Đăng ký lưu kết quả</span>
              </Link>

              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={sharing}
                aria-busy={sharing}
                className={secondaryActionClass}
              >
                <ShareNetwork aria-hidden="true" size={15} weight="bold" />
                <span>Chia sẻ</span>
              </button>

              <Link href="/login" className={secondaryActionClass}>
                <SignIn aria-hidden="true" size={15} weight="bold" />
                <span>Đăng nhập</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            className={secondaryActionClass}
          >
            <FilePdf aria-hidden="true" size={15} weight="bold" />
            <span>Xuất PDF</span>
          </button>
        </div>

        {onReset && (
          <button type="button" onClick={onReset} className={ghostActionClass}>
            <ArrowCounterClockwise aria-hidden="true" size={15} weight="bold" />
            <span>Kiểm tra mới</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {feedback && (
          <motion.p
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              feedback.tone === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400"
            )}
          >
            {feedback.tone === "success" ? (
              <Check aria-hidden="true" size={14} weight="bold" />
            ) : (
              <WarningCircle aria-hidden="true" size={14} weight="fill" />
            )}
            <span>{feedback.message}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {mode === "user" && targetIdentifier && (
        <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/35 px-4 py-3 text-xs leading-relaxed text-muted-foreground dark:border-white/10">
          <Info
            aria-hidden="true"
            size={15}
            weight="bold"
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
          <p className="max-w-[65ch]">
            <strong className="font-semibold text-foreground">
              Chủ sở hữu hợp pháp của chỉ số này?
            </strong>{" "}
            Chọn{" "}
            <strong className="font-semibold text-foreground">Khiếu nại</strong>{" "}
            kèm bằng chứng xác thực để được xem xét gỡ khỏi danh sách cảnh báo.
          </p>
        </div>
      )}
    </motion.div>
  )
}
