"use client"

import { useEffect, useId } from "react"
import { ShieldStar } from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth.store"
import { useUserQuotaStore } from "@/features/check/store/user-quota.store"

export function UserQuotaCard() {
  const quotaLabelId = useId()
  const token = useAuthStore((state) => state.token)
  const {
    quota: storedQuota,
    sourceToken,
    isLoading,
    error,
    fetchQuota,
  } = useUserQuotaStore()
  const quota = sourceToken === token && token ? storedQuota : null
  const fullName = quota?.fullName || "Tài khoản của bạn"
  const initials =
    quota?.fullName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("vi-VN") || "?"
  const percentage =
    quota && quota.limit > 0
      ? Math.min(100, Math.max(0, (quota.used / quota.limit) * 100))
      : 0

  useEffect(() => {
    void fetchQuota()
    const onFocus = () => void fetchQuota()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [token, fetchQuota])

  useEffect(() => {
    if (!quota) return
    const delay = new Date(`${quota.resetsAt}+07:00`).getTime() - Date.now()
    if (!Number.isFinite(delay)) return
    const timer = window.setTimeout(
      () => void fetchQuota(),
      Math.max(1000, Math.min(delay + 1000, 2147483647))
    )
    return () => window.clearTimeout(timer)
  }, [quota, fetchQuota])

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3.5">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className="truncate text-xs font-bold text-foreground"
            title={fullName}
          >
            {fullName}
          </p>
          {quota?.rankName && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              <ShieldStar aria-hidden="true" size={11} weight="fill" />
              <span className="truncate">{quota.rankName}</span>
            </span>
          )}
          <p className="text-[11px] text-muted-foreground">Tài khoản bảo vệ</p>
        </div>
      </div>
      <div className="space-y-1.5 pt-1" aria-busy={isLoading}>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span id={quotaLabelId} className="text-muted-foreground">
            Hạn mức tra cứu AI
          </span>
          <span className="font-bold text-foreground">
            {quota ? `${quota.used}/${quota.limit}` : "—/—"}
          </span>
        </div>
        {quota ? (
          <>
            <div
              role="progressbar"
              aria-labelledby={quotaLabelId}
              aria-valuemin={0}
              aria-valuemax={quota.limit || 1}
              aria-valuenow={Math.min(quota.used, quota.limit)}
              aria-valuetext={`Đã dùng ${quota.used}/${quota.limit} lượt hôm nay`}
              className="h-1.5 w-full overflow-hidden rounded-full bg-border"
            >
              <div
                className="h-full rounded-full bg-primary motion-safe:transition-all motion-safe:duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p
              aria-live="polite"
              className="text-right text-[10px] text-muted-foreground"
            >
              Đã dùng {quota.used}/{quota.limit} lượt hôm nay · Còn{" "}
              {quota.remaining} lượt
            </p>
          </>
        ) : (
          <p role="status" className="text-[10px] text-muted-foreground">
            {isLoading ? "Đang tải hạn mức…" : "Chưa có thông tin hạn mức"}
          </p>
        )}
        {error && (
          <div className="text-[10px] text-destructive">
            <p role="status">{error}</p>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void fetchQuota()}
              className="mt-1 rounded underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
