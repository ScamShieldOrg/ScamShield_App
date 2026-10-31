"use client"

import { useRef, useState } from "react"
import { isAxiosError } from "axios"
import { checkScamContent } from "../services/check.service"
import {
  normalizeScamCheckRequest,
  validateScamCheck,
} from "../utils/check-validation"
import { useUserQuotaStore } from "../store/user-quota.store"
import type {
  ScamCheckInputType,
  ScamCheckResult,
} from "../types/scam-check.types"

export function useUserScamCheck() {
  const [inputType, setInputType] = useState<ScamCheckInputType>("MESSAGE")
  const [drafts, setDrafts] = useState<
    Partial<Record<ScamCheckInputType, string>>
  >({})
  const [results, setResults] = useState<
    Partial<Record<ScamCheckInputType, ScamCheckResult | null>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<ScamCheckInputType, string | null>>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const locked = useRef(false)
  const content = drafts[inputType] ?? ""
  const result = results[inputType] ?? null
  const error = errors[inputType] ?? null

  const changeContent = (value: string) => {
    if (locked.current) return
    setDrafts((previous) => ({ ...previous, [inputType]: value }))
    setResults((previous) => ({ ...previous, [inputType]: null }))
    setErrors((previous) => ({ ...previous, [inputType]: null }))
  }

  const changeType = (type: ScamCheckInputType) => {
    if (!locked.current) setInputType(type)
  }

  const analyze = async () => {
    if (locked.current) return
    const payload = normalizeScamCheckRequest({ inputType, content })
    const validationError = validateScamCheck(payload)
    setErrors((previous) => ({ ...previous, [inputType]: validationError }))
    if (validationError) return
    locked.current = true
    setIsLoading(true)
    setResults((previous) => ({ ...previous, [inputType]: null }))
    try {
      const response = await checkScamContent(payload)
      setResults((previous) => ({ ...previous, [inputType]: response }))
    } catch (err) {
      let message = "Chưa thể phân tích nội dung. Vui lòng thử lại sau."
      if (isAxiosError(err)) {
        if (err.response?.status === 429)
          message =
            "Bạn đã sử dụng hết lượt kiểm tra hôm nay. Hạn mức đặt lại lúc 00:00 giờ Việt Nam."
        else if (err.response?.status === 401)
          message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        else if (!err.response)
          message =
            "Kết nối bị gián đoạn hoặc quá thời gian chờ. Yêu cầu có thể đã được xử lý và tính lượt. Vui lòng chờ trước khi thử lại."
        else message = err.response.data?.message || message
      } else if (err instanceof Error) message = err.message
      setErrors((previous) => ({ ...previous, [inputType]: message }))
    } finally {
      await useUserQuotaStore.getState().fetchQuota()
      locked.current = false
      setIsLoading(false)
    }
  }

  return {
    inputType,
    content,
    result,
    error,
    isLoading,
    changeType,
    changeContent,
    analyze,
  }
}
