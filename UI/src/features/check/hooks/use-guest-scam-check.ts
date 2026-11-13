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

type ResultMap = Partial<Record<GuestInputType, GuestCheckResult | null>>
type ErrorMap = Partial<Record<GuestInputType, string | null>>
type ElapsedMap = Partial<Record<GuestInputType, number>>

/** Real measurement helper; never a made-up duration. */
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

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

/**
 * Guest scan state machine.
 *
 * Results and errors are keyed by the input type of the submitted request, not
 * by a render-time prop: a scan resolves after `inputType` may have changed, so
 * reading the prop inside the write would file a PHONE result under TEXT and
 * silently drop it.
 */
export function useGuestScamCheck(inputType: GuestInputType) {
  const [phase, setPhase] = useState<Phase>("initializing")
  const [quota, setQuota] = useState<GuestQuota | null>(null)
  const [results, setResults] = useState<ResultMap>({})
  const [errors, setErrors] = useState<ErrorMap>({})
  // Measured round-trip per submitted type, so a verdict always shows the
  // duration of the request that actually produced it.
  const [elapsedByType, setElapsedByType] = useState<ElapsedMap>({})
  const [quotaError, setQuotaError] = useState<string | null>(null)
  // The type that produced the currently displayed scan. Reading through this
  // key instead of the live tab keeps the resolved scan on screen when the
  // user switches tabs, and never files it under the wrong type.
  const [lastSubmittedType, setLastSubmittedType] =
    useState<GuestInputType | null>(null)
  const resultType = lastSubmittedType ?? inputType
  const result = results[resultType] ?? null
  const error = errors[resultType] ?? null
  // Duration of the request that produced the displayed result, in ms.
  const executionTimeMs = elapsedByType[resultType] ?? 0
  const locked = useRef(false)
  const token = useRef<string | null>(null)

  const writeResult = useCallback(
    (type: GuestInputType, value: GuestCheckResult | null) => {
      setResults((previous) => ({ ...previous, [type]: value }))
    },
    []
  )

  const writeError = useCallback(
    (type: GuestInputType, value: string | null) => {
      setErrors((previous) => ({ ...previous, [type]: value }))
    },
    []
  )

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
    // Key every write by the type actually submitted, captured before any await.
    const submittedType = payload.inputType
    setLastSubmittedType(submittedType)
    const validationError = validateScamCheck(payload)
    writeError(submittedType, validationError)
    if (validationError) return
    locked.current = true
    writeResult(submittedType, null)
    setPhase("quota")
    let attemptedScan = false
    try {
      const session = await restoreGuestSession()
      token.current = session.sessionToken
      const currentQuota = await getGuestQuota(session.sessionToken)
      setQuota(currentQuota)
      setQuotaError(null)
      if (currentQuota.remaining <= 0) {
        writeError(
          submittedType,
          "Bạn đã sử dụng hết lượt kiểm tra trong ngày."
        )
        return
      }
      setPhase("scanning")
      attemptedScan = true
      // Measure the scan request itself: the session and quota round-trips are
      // not part of the analysis, and the result must never show a made-up
      // duration. The duration is written together with the result so the
      // verdict never renders once with a stale or zero execution time.
      const startedAt = now()
      const scanResult = await submitGuestCheck(session.sessionToken, payload)
      const durationMs = now() - startedAt
      setElapsedByType((previous) => ({
        ...previous,
        [submittedType]: durationMs,
      }))
      writeResult(submittedType, scanResult)
    } catch (err) {
      writeError(submittedType, errorMessage(err))
      if (!attemptedScan)
        setQuotaError(
          "Chưa xác minh được lượt còn lại. Vui lòng cập nhật và thử lại."
        )
      if (isAxiosError(err) && err.response?.status === 401) {
        // Recover the session without automatically repeating a potentially charged scan.
        try {
          token.current = (await restoreGuestSession()).sessionToken
          writeError(
            submittedType,
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

  const clearResult = (type: GuestInputType = inputType) => {
    writeResult(type, null)
    writeError(type, null)
  }

  return {
    phase,
    quota,
    result,
    error,
    quotaError,
    /** Type that produced the displayed result/error; null before any submit. */
    lastSubmittedType,
    /** Locally measured duration of the displayed scan, in ms (never faked). */
    executionTimeMs,
    submit,
    refreshQuota,
    clearResult,
  }
}
