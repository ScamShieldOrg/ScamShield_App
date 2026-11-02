"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { isAxiosError } from "axios"
import {
  normalizeScamCheckRequest,
  validateScamCheck,
} from "../utils/check-validation"
import {
  getGuestQuota,
  restoreGuestSession,
  submitGuestCheck,
} from "../services/guest-check.service"
import type {
  GuestCheckRequest,
  GuestCheckResult,
  GuestQuota,
  GuestInputType,
} from "../types/guest-check.types"

type Phase = "initializing" | "idle" | "quota" | "scanning" | "updating"

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Kết nối bị gián đoạn hoặc quá thời gian chờ. Yêu cầu có thể đã được xử lý. Kiểm tra lại lượt còn lại trước khi thử lại."
    }
    if (error.response.status === 429)
      return "Bạn đã sử dụng hết lượt kiểm tra trong ngày."
    if (error.response.status === 401)
      return "Phiên khách đã hết hạn. Vui lòng cập nhật lượt còn lại rồi thử lại."
    return (
      error.response.data?.message ||
      "Chưa thể kiểm tra nội dung. Vui lòng thử lại sau."
    )
  }
  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại."
}

export function useGuestScamCheck(inputType: GuestInputType) {
  const [phase, setPhase] = useState<Phase>("initializing")
  const [quota, setQuota] = useState<GuestQuota | null>(null)
  const [results, setResults] = useState<
    Partial<Record<GuestInputType, GuestCheckResult | null>>
  >({})
  const [errors, setErrors] = useState<
    Partial<Record<GuestInputType, string | null>>
  >({})
  const result = results[inputType] ?? null
  const error = errors[inputType] ?? null
  const setResult = (value: GuestCheckResult | null) => {
    setResults((previous) => ({ ...previous, [inputType]: value }))
  }
  const setError = (value: string | null) => {
    setErrors((previous) => ({ ...previous, [inputType]: value }))
  }
  const [quotaError, setQuotaError] = useState<string | null>(null)
  const locked = useRef(false)
  const token = useRef<string | null>(null)

  const refreshQuota = useCallback(async () => {
    if (locked.current) return
    locked.current = true
    setPhase("quota")
    try {
      const session = await restoreGuestSession()
      token.current = session.sessionToken
      setQuota(await getGuestQuota(session.sessionToken))
      setQuotaError(null)
    } catch (err) {
      setQuotaError(errorMessage(err))
    } finally {
      locked.current = false
      setPhase("idle")
    }
  }, [])

  useEffect(() => {
    let active = true
    locked.current = true
    async function initialize() {
      try {
        const session = await restoreGuestSession()
        const initialQuota = await getGuestQuota(session.sessionToken)
        if (active) {
          token.current = session.sessionToken
          setQuota(initialQuota)
          setQuotaError(null)
        }
      } catch (err) {
        if (active) setQuotaError(errorMessage(err))
      } finally {
        if (active) {
          locked.current = false
          setPhase("idle")
        }
      }
    }
    void initialize()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onFocus = () => void refreshQuota()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshQuota])

  const submit = async (request: GuestCheckRequest) => {
    if (locked.current) return
    const payload = normalizeScamCheckRequest(request)
    const validationError = validateScamCheck(payload)
    setError(validationError)
    if (validationError) return
    locked.current = true
    setResult(null)
    setPhase("quota")
    let attemptedScan = false
    try {
      const session = await restoreGuestSession()
      token.current = session.sessionToken
      const currentQuota = await getGuestQuota(session.sessionToken)
      setQuota(currentQuota)
      setQuotaError(null)
      if (currentQuota.remaining <= 0) {
        setError("Bạn đã sử dụng hết lượt kiểm tra trong ngày.")
        return
      }
      setPhase("scanning")
      attemptedScan = true
      setResult(
        await submitGuestCheck(session.sessionToken, payload)
      )
    } catch (err) {
      setError(errorMessage(err))
      if (!attemptedScan)
        setQuotaError(
          "Chưa xác minh được lượt còn lại. Vui lòng cập nhật và thử lại."
        )
      if (isAxiosError(err) && err.response?.status === 401) {
        // Recover the session without automatically repeating a potentially charged scan.
        try {
          token.current = (await restoreGuestSession()).sessionToken
          setError(
            "Phiên khách đã được khôi phục. Vui lòng bấm Phân tích để thử lại."
          )
        } catch {
          token.current = null
        }
      }
    } finally {
      if (attemptedScan && token.current) {
        setPhase("updating")
        try {
          setQuota(await getGuestQuota(token.current))
          setQuotaError(null)
        } catch {
          setQuotaError(
            "Chưa cập nhật được lượt còn lại. Vui lòng thử cập nhật lại."
          )
        }
      }
      locked.current = false
      setPhase("idle")
    }
  }

  const clearResult = () => {
    setResult(null)
    setError(null)
  }

  return {
    phase,
    quota,
    result,
    error,
    quotaError,
    submit,
    refreshQuota,
    clearResult,
  }
}
