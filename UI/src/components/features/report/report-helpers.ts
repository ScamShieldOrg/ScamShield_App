export type PageToken = number | "ellipsis-left" | "ellipsis-right"

/**
 * Builds a compact pagination token list with ellipses when `totalPages` is large.
 * Pages are 1-indexed.
 */
export function buildReportPageRange(
  currentPage: number,
  totalPages: number
): PageToken[] {
  const safeTotal = Math.max(1, Math.floor(totalPages))
  const safeCurrent = Math.min(Math.max(1, Math.floor(currentPage)), safeTotal)

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1)
  }

  const tokens: PageToken[] = [1]
  const windowStart = Math.max(2, safeCurrent - 1)
  const windowEnd = Math.min(safeTotal - 1, safeCurrent + 1)

  if (windowStart > 2) {
    tokens.push("ellipsis-left")
  }

  for (let p = windowStart; p <= windowEnd; p += 1) {
    tokens.push(p)
  }

  if (windowEnd < safeTotal - 1) {
    tokens.push("ellipsis-right")
  }

  tokens.push(safeTotal)
  return tokens
}

/**
 * Extracts the numeric identifier from display report IDs such as `#RPT-1042`, `RPT-1042`, or `1042`.
 */
export function extractReportNumericId(rawId: string | number): string {
  const str = String(rawId ?? "")
  const digits = str.replace(/\D/g, "")
  return digits || str.trim()
}

/**
 * Formats Vietnamese mobile numbers (`0xxxxxxxxx`, `+84xxxxxxxxx`) cleanly while preserving hotlines/other values.
 */
export function formatReportPhoneDisplay(
  value: string,
  hotlineFormatter?: (val: string) => string
): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (hotlineFormatter) {
    const hotline = hotlineFormatter(trimmed)
    if (hotline !== trimmed) return hotline
  }
  const compact = trimmed.replace(/[\s().-]/g, "")
  if (/^0\d{9}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7)}`
  }
  if (/^\+84\d{9}$/.test(compact)) {
    return `+84 ${compact.slice(3, 6)} ${compact.slice(6, 9)} ${compact.slice(9)}`
  }
  return trimmed
}

/**
 * Computes the next tab index for ArrowLeft / ArrowRight / Home / End keyboard navigation.
 */
export function getNextTabIndex(
  currentIndex: number,
  total: number,
  key: string
): number | null {
  if (total <= 0) return null
  if (key === "ArrowRight") return (currentIndex + 1) % total
  if (key === "ArrowLeft") return (currentIndex - 1 + total) % total
  if (key === "Home") return 0
  if (key === "End") return total - 1
  return null
}
