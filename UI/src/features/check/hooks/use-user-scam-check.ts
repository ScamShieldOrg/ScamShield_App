"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/store/auth.store"
import { checkScamContent } from "../services/check.service"
import {
  normalizeScamCheckRequest,
  validateScamCheck,
} from "../utils/check-validation"
import { useUserQuotaStore } from "../store/user-quota.store"
import type { CheckScanResponse, CheckType } from "../types/check.types"
import type { ScamCheckInputType } from "../types/scam-check.types"

const EMPTY_DRAFTS: Record<CheckType, string> = {
  TEXT: "",
  URL: "",
  PHONE: "",
  BANK_ACCOUNT: "",
}

/**
 * The UI tab is "TEXT"; the backend bucket for the same content is "MESSAGE".
 * Everything else (URL / PHONE / BANK_ACCOUNT) keeps its name on both sides.
 */
function toRequestInputType(type: CheckType): ScamCheckInputType {
  return type === "TEXT" ? "MESSAGE" : type
}

const QUOTA_EXHAUSTED_MESSAGE =
  "Bạn đã dùng hết hạn mức kiểm tra hôm nay. Hạn mức được đặt lại lúc 00:00 giờ Việt Nam."

export function useUserScamCheck() {
  const [inputType, setInputType] = useState<CheckType>("TEXT")
  // Drafts, results and errors are kept per tab so switching type never
  // discards what the user already typed or the verdict they were reading.
  const [drafts, setDrafts] = useState<Partial<Record<CheckType, string>>>({})
  const [results, setResults] = useState<
    Partial<Record<CheckType, CheckScanResponse | null>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<CheckType, string | null>>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  // The type that produced the currently displayed scan. Reading through this
  // key instead of the live tab keeps the resolved scan on screen when the
  // user switches tabs, and never files it under the wrong type.
  const [lastSubmittedType, setLastSubmittedType] = useState<CheckType | null>(
    null
  )
  // The exact text that produced the displayed scan. The action bar prefills the
  // report form from it, and the live draft may have changed since the submit.
  const [lastSubmittedContent, setLastSubmittedContent] = useState("")
  const locked = useRef(false)

  const token = useAuthStore((state) => state.token)
  const storedQuota = useUserQuotaStore((state) => state.quota)
  const quotaSourceToken = useUserQuotaStore((state) => state.sourceToken)
  const fetchQuota = useUserQuotaStore((state) => state.fetchQuota)
  const quotaLoading = useUserQuotaStore((state) => state.isLoading)
  const storedQuotaError = useUserQuotaStore((state) => state.error)
  // Ignore a quota fetched for a previous session token.
  const quota = quotaSourceToken === token ? storedQuota : null
  const quotaExhausted = quota != null && quota.remaining <= 0

  // The sidebar quota card already fetches on mount; the store collapses
  // concurrent calls into one request, so this also covers pages where that
  // card is not rendered (e.g. the mobile drawer).
  useEffect(() => {
    if (!token) return
    void fetchQuota()
  }, [token, fetchQuota])

  const content = drafts[inputType] ?? ""
  // Resolve through the submitted type: a scan resolves after `inputType` may
  // have changed, so the live tab would hide the verdict the user just got.
  const resultType = lastSubmittedType ?? inputType
  const result = results[resultType] ?? null
  const error = errors[resultType] ?? null

  const changeDraft = (type: CheckType, value: string) => {
    if (locked.current) return
    setDrafts((previous) => ({ ...previous, [type]: value }))
    setResults((previous) => ({ ...previous, [type]: null }))
    setErrors((previous) => ({ ...previous, [type]: null }))
  }

  const changeType = (type: CheckType) => {
    if (!locked.current) setInputType(type)
  }

  const analyze = async (
    submittedContent?: string,
    submittedType?: CheckType
  ) => {
    if (locked.current) return
    const type = submittedType ?? inputType
    // Pin the type before any await: the response must be filed under the type
    // that was actually submitted, even if the user switches tab mid-flight.
    setLastSubmittedType(type)
    const text = submittedContent ?? drafts[type] ?? ""
    // Remember the submitted text: the draft may change before the user taps
    // "gửi báo cáo", and the prefill must quote what was actually checked.
    setLastSubmittedContent(text)
    // Validate with the backend vocabulary, then send the form the service
    // actually reads (`check_type`), never the raw `inputType` field.
    const payload = normalizeScamCheckRequest({
      inputType: toRequestInputType(type),
      content: text,
    })
    const validationError = validateScamCheck(payload)
    setErrors((previous) => ({ ...previous, [type]: validationError }))
    if (validationError) return
    if (quotaExhausted) {
      setErrors((previous) => ({
        ...previous,
        [type]: QUOTA_EXHAUSTED_MESSAGE,
      }))
      return
    }
    locked.current = true
    setIsLoading(true)
    setResults((previous) => ({ ...previous, [type]: null }))
    try {
      const response = await checkScamContent({
        content: payload.content,
        check_type: type,
      })
      setResults((previous) => ({ ...previous, [type]: response }))
    } catch (err) {
      // checkScamContent already translates axios failures into Vietnamese
      // Error messages, so surface that text instead of a status-code guess.
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Chưa thể phân tích nội dung. Vui lòng thử lại sau."
      setErrors((previous) => ({ ...previous, [type]: message }))
    } finally {
      // The backend reserves a quota slot even when the scan fails mid-flight.
      await useUserQuotaStore.getState().fetchQuota()
      locked.current = false
      setIsLoading(false)
    }
  }

  // `ScamCheckInput` expects a complete record, not a sparse one.
  const draftMap: Record<CheckType, string> = {
    ...EMPTY_DRAFTS,
    ...drafts,
  }

  return {
    inputType,
    content,
    result,
    error,
    isLoading,
    lastSubmittedType,
    lastSubmittedContent,
    quota,
    quotaExhausted,
    quotaLoading,
    quotaError: storedQuotaError,
    refreshQuota: fetchQuota,
    drafts: draftMap,
    changeType,
    changeDraft,
    analyze,
  }
}
