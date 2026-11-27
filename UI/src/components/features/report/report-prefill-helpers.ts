import type { ReportThreatType } from "@/features/report/types/report.types"

/** Keep in sync with `REPORT_PREFILL_KEY` in the check action bar. */
export const REPORT_PREFILL_KEY = "scamshield.report-prefill"

const INPUT_TYPE_TO_THREAT_TYPE: Record<string, ReportThreatType> = {
  URL: "WEBSITE",
  PHONE: "PHONE",
  BANK_ACCOUNT: "BANK_ACCOUNT",
}

/** Draft written by the check result action bar before navigating here. */
export interface ReportPrefillDraft {
  scanId?: string | null
  checkId?: number | null
  inputType?: string | null
  targetIdentifier?: string | null
  reportedMessage?: string | null
  description?: string | null
}

/**
 * Reads the draft without consuming it, so the form can seed its fields during
 * the first render. `clearReportPrefill` drops it once the form has mounted.
 */
export function peekReportPrefill(): ReportPrefillDraft | null {
  try {
    if (typeof window === "undefined") return null
    const raw = window.sessionStorage.getItem(REPORT_PREFILL_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as ReportPrefillDraft
  } catch {
    return null
  }
}

/** One-shot hand-off: never re-apply stale context on a later visit. */
export function clearReportPrefill() {
  try {
    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(REPORT_PREFILL_KEY)
  } catch {
    // Private mode or a blocked storage API: there is nothing to clear.
  }
}

export function threatTypeFromInputType(
  value: string | null | undefined
): ReportThreatType | null {
  if (!value) return null
  return INPUT_TYPE_TO_THREAT_TYPE[value] ?? null
}

export function parseCheckId(
  value: string | number | null | undefined
): number | null {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
}

export function extractTrailingDigits(value: string): string | null {
  const match = /(\d+)\s*$/.exec(value)
  return match ? match[1] : null
}

export function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim()
  return trimmed.length <= maxLength
    ? trimmed
    : `${trimmed.slice(0, maxLength - 3).trimEnd()}...`
}
