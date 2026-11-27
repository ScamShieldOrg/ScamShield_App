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
  // Drafts, results, submitted content and errors are kept per tab so switching
  // type or editing text never discards what the user already typed or read.
  const [drafts, setDrafts] = useState<Partial<Record<CheckType, string>>>({})
  const [results, setResults] = useState<
    Partial<Record<CheckType, CheckScanResponse | null>>
  >({})
  const [submittedContents, setSubmittedContents] = useState<
    Partial<Record<CheckType, string>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<CheckType, string | null>>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastSubmittedType, setLastSubmittedType] = useState<CheckType | null>(
    null
  )
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

  useEffect(() => {
    if (!token) return
    void fetchQuota()
  }, [token, fetchQuota])

  const content = drafts[inputType] ?? ""
  const resultType = lastSubmittedType ?? inputType
  const result = results[resultType] ?? null
  const error = errors[resultType] ?? null
  const lastSubmittedContent = submittedContents[resultType] ?? ""
  const isResultStale = Boolean(
    result &&
      lastSubmittedType === inputType &&
      content.trim() !== lastSubmittedContent.trim()
  )

  const changeDraft = (type: CheckType, value: string) => {
    if (locked.current) return
    setDrafts((previous) => ({ ...previous, [type]: value }))
    // Clear stale error on edit, but preserve the previous verdict so users do
    // not lose what they are reading on an accidental keystroke.
    setErrors((previous) => ({ ...previous, [type]: null }))
  }

  const changeType = (type: CheckType) => {
    if (!locked.current) setInputType(type)
  }

  const clearResult = (type: CheckType = resultType) => {
    if (locked.current) return
    setResults((previous) => ({ ...previous, [type]: null }))
    setErrors((previous) => ({ ...previous, [type]: null }))
  }

  const analyze = async (
    submittedContent?: string,
    submittedType?: CheckType
  ) => {
    if (locked.current) return
    const type = submittedType ?? inputType
    setLastSubmittedType(type)
    const text = submittedContent ?? drafts[type] ?? ""
    const payload = normalizeScamCheckRequest({
      inputType: toRequestInputType(type),
      content: text,
    })
    setSubmittedContents((previous) => ({ ...previous, [type]: payload.content }))
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
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Chưa thể phân tích nội dung. Vui lòng thử lại sau."
      setErrors((previous) => ({ ...previous, [type]: message }))
    } finally {
      await useUserQuotaStore.getState().fetchQuota()
      locked.current = false
      setIsLoading(false)
    }
  }

  const retry = () => {
    const targetType = lastSubmittedType ?? inputType
    const targetText =
      drafts[targetType]?.trim() || submittedContents[targetType] || ""
    if (!targetText) return
    void analyze(targetText, targetType)
  }

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
    isResultStale,
    quota,
    quotaExhausted,
    quotaLoading,
    quotaError: storedQuotaError,
    refreshQuota: fetchQuota,
    drafts: draftMap,
    changeType,
    changeDraft,
    clearResult,
    analyze,
    retry,
  }
}
