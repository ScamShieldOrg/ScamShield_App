import type { HistoryRiskStatus } from "@/features/history/types/history.types"

export type PaginationToken = number | "ellipsis"

export interface HistoryFilterSnapshot {
  searchQuery: string
  timeRange: string
  scamType: string
  riskStatus: "ALL" | HistoryRiskStatus
}

export interface HistoryRiskMeta {
  status: HistoryRiskStatus
  label: string
  pillLabel: string
  dotClass: string
  badgeClass: string
  scoreClass: string
}

export interface HistoryTargetMeta {
  iconKey:
    | "phone"
    | "url"
    | "sms"
    | "chat"
    | "bank"
    | "traffic"
    | "crypto"
    | "message"
  label: string
  surfaceClass: string
}

export const DEFAULT_HISTORY_TIME_RANGE = "30_days"
export const DEFAULT_HISTORY_SCAM_TYPE = "all"

/**
 * Check whether the user has narrowed the history list away from defaults.
 */
export function hasActiveHistoryFilters(
  filters: HistoryFilterSnapshot
): boolean {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.timeRange !== DEFAULT_HISTORY_TIME_RANGE ||
    filters.scamType !== DEFAULT_HISTORY_SCAM_TYPE ||
    filters.riskStatus !== "ALL"
  )
}

/**
 * Build a compact pagination sequence with ellipsis so large page counts
 * never overflow horizontally.
 */
export function buildPaginationRange(
  currentPage: number,
  totalPages: number
): PaginationToken[] {
  const safeTotal = Math.max(1, Math.floor(totalPages))
  const safeCurrent = Math.min(Math.max(1, Math.floor(currentPage)), safeTotal)

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1)
  }

  const tokens: PaginationToken[] = [1]

  const windowStart = Math.max(2, safeCurrent - 1)
  const windowEnd = Math.min(safeTotal - 1, safeCurrent + 1)

  if (windowStart > 2) {
    tokens.push("ellipsis")
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    tokens.push(page)
  }

  if (windowEnd < safeTotal - 1) {
    tokens.push("ellipsis")
  }

  tokens.push(safeTotal)
  return tokens
}

/**
 * Calm Authority visual tokens for history risk verdicts (WCAG AA >= 4.5:1).
 */
export function getHistoryRiskMeta(status?: string | null): HistoryRiskMeta {
  const normalized = (status || "").toUpperCase()

  switch (normalized) {
    case "DANGEROUS":
    case "SCAM_RISK":
      return {
        status: "DANGEROUS",
        label: "Lừa đảo nguy cơ cao",
        pillLabel: "Nguy cơ cao",
        dotClass: "bg-rose-600 dark:bg-rose-400",
        badgeClass:
          "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
        scoreClass: "text-rose-800 dark:text-rose-300",
      }
    case "SUSPICIOUS":
      return {
        status: "SUSPICIOUS",
        label: "Nghi vấn rủi ro",
        pillLabel: "Nghi vấn",
        dotClass: "bg-amber-600 dark:bg-amber-400",
        badgeClass:
          "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
        scoreClass: "text-amber-900 dark:text-amber-300",
      }
    case "SAFE":
    case "LOW_RISK":
      return {
        status: "SAFE",
        label: "An toàn xác minh",
        pillLabel: "An toàn",
        dotClass: "bg-emerald-600 dark:bg-emerald-400",
        badgeClass:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
        scoreClass: "text-emerald-800 dark:text-emerald-300",
      }
    case "UNKNOWN":
    default:
      return {
        status: "UNKNOWN",
        label: "Chưa đủ dữ liệu",
        pillLabel: "Chưa xác định",
        dotClass: "bg-sky-600 dark:bg-sky-400",
        badgeClass:
          "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
        scoreClass: "text-sky-800 dark:text-sky-300",
      }
  }
}

/**
 * Consistent Calm Authority icon surface and label for target types.
 */
export function getHistoryTargetMeta(
  targetType?: string | null
): HistoryTargetMeta {
  const normalized = (targetType || "").toUpperCase()

  switch (normalized) {
    case "PHONE":
      return {
        iconKey: "phone",
        label: "Số điện thoại",
        surfaceClass:
          "border-sky-500/20 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
      }
    case "URL":
      return {
        iconKey: "url",
        label: "Đường dẫn (URL)",
        surfaceClass:
          "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
      }
    case "SMS_BANK":
      return {
        iconKey: "sms",
        label: "SMS Ngân hàng",
        surfaceClass:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
      }
    case "TELEGRAM":
      return {
        iconKey: "chat",
        label: "Tin nhắn / MXH",
        surfaceClass:
          "border-sky-500/20 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
      }
    case "BANK_ACCOUNT":
      return {
        iconKey: "bank",
        label: "Tài khoản ngân hàng",
        surfaceClass:
          "border-border bg-muted/60 text-foreground dark:border-white/10 dark:bg-muted/40",
      }
    case "TRAFFIC_FINE":
      return {
        iconKey: "traffic",
        label: "Thông báo phạt nguội",
        surfaceClass:
          "border-rose-500/20 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
      }
    case "CRYPTO":
      return {
        iconKey: "crypto",
        label: "Tiền ảo / Đầu tư",
        surfaceClass:
          "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
      }
    case "MESSAGE":
    case "TEXT":
    default:
      return {
        iconKey: "message",
        label: "Nội dung tin nhắn",
        surfaceClass:
          "border-border bg-muted/60 text-foreground dark:border-white/10 dark:bg-muted/40",
      }
  }
}

/**
 * Whether the target value is a structured identifier (phone, URL, account)
 * that should render in monospace font rather than prose sans-serif.
 */
export function isIdentifierTargetType(targetType?: string | null): boolean {
  const normalized = (targetType || "").toUpperCase()
  return (
    normalized === "PHONE" ||
    normalized === "URL" ||
    normalized === "BANK_ACCOUNT" ||
    normalized === "SMS_BANK" ||
    normalized === "TELEGRAM" ||
    normalized === "CRYPTO"
  )
}

/**
 * Avoid rendering a duplicate snippet line when the backend already puts
 * the full message text into targetValue.
 */
export function shouldShowHistorySnippet(
  targetValue?: string | null,
  snippet?: string | null
): boolean {
  const cleanSnippet = (snippet || "")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\.{3,}$|…+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleanSnippet) return false

  const cleanTarget = (targetValue || "")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleanTarget) return true
  return !cleanTarget.toLowerCase().startsWith(cleanSnippet.toLowerCase())
}

/**
 * Format an ISO timestamp into a concise Vietnamese date-time string.
 */
export function formatHistoryDateTime(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
