"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ShareNetwork,
  Megaphone,
  Scales,
  FilePdf,
  UserPlus,
  SignIn,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

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

const secondaryLinkClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C6C6CE]/60 bg-white px-4 py-2.5 text-xs font-semibold text-[#131B2E] shadow-2xs hover:bg-[#F2F3FF] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"

const printButtonClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0B132B] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#131B2E] active:scale-95 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"

export function ScamActionBar({
  scanId,
  checkId,
  mode,
  inputType = null,
  targetIdentifier = null,
  reportedMessage = null,
  description = null,
}: ScamActionBarProps) {
  const [sharing, setSharing] = useState(false)
  const [feedback, setFeedback] = useState<ShareFeedback>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    setFeedback(null)
    // Never invent a link: share the page the user is actually looking at.
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
                "Trình duyệt không cho phép sao chép tự động. Vui lòng sao " +
                "chép liên kết trên thanh địa chỉ.",
            }
      )
    } catch (error) {
      // The user dismissed the native share sheet: nothing was copied.
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
      // Private mode / quota errors: the report form still gets the scanId
      // from the URL, it just loses the extra context.
    }
  }

  const handleDisputeClick = () => {
    if (mode !== "user") return
    const draft: DisputePrefillDraft = {
      scanId,
      checkId,
      inputType,
      // Only a matched indicator is a real disputed subject; free-form message
      // text is never an indicator, so it must not be pre-filled as one.
      indicatorValue: targetIdentifier,
      savedAt: new Date().toISOString(),
    }
    try {
      window.sessionStorage.setItem(DISPUTE_PREFILL_KEY, JSON.stringify(draft))
    } catch {
      // Private mode / quota errors: the dispute page still opens the form
      // from the query string, it just loses the extra context.
    }
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Real share: native sheet first, clipboard fallback. */}
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={sharing}
            aria-busy={sharing}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#006644] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#004d33] active:scale-95 disabled:cursor-progress disabled:opacity-70 dark:bg-emerald-700 dark:hover:bg-emerald-800"
          >
            <ShareNetwork size={16} weight="bold" />
            <span>Chia sẻ kết quả</span>
          </button>

          {mode === "user" ? (
            <Link
              href={`/user/reports/new?scanId=${encodeURIComponent(scanId)}`}
              onClick={handleReportClick}
              className={secondaryLinkClass}
            >
              <Megaphone size={16} weight="bold" />
              <span>Đẩy chỉ số vào Báo cáo của tôi</span>
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#006644] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#004d33] active:scale-95 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              <UserPlus size={16} weight="bold" />
              <span>Đăng ký để lưu kết quả này</span>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mode === "user" && (
            <Link
              href={`/user/disputes?scanId=${encodeURIComponent(scanId)}`}
              onClick={handleDisputeClick}
              className={secondaryLinkClass}
            >
              <Scales size={16} weight="bold" />
              <span>Khiếu nại kết quả phân tích</span>
            </Link>
          )}

          {mode === "guest" && (
            <Link href="/login" className={secondaryLinkClass}>
              <SignIn size={16} weight="bold" />
              <span>Đăng nhập</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            className={printButtonClass}
          >
            <FilePdf size={16} weight="bold" />
            <span>Xuất biên bản thẩm định PDF</span>
          </button>
        </div>
      </div>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs font-semibold",
            feedback.tone === "success"
              ? "text-[#006644] dark:text-emerald-400"
              : "text-[#BA1A1A] dark:text-rose-400"
          )}
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
