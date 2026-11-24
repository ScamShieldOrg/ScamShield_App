"use client"

import { useEffect, useId } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { ArrowClockwise, ShieldStar } from "@phosphor-icons/react"
import { useAuthStore } from "@/store/auth.store"
import { useUserQuotaStore } from "@/features/check/store/user-quota.store"
import { cn } from "@/lib/utils"

interface UserQuotaCardProps {
  onNavigate?: () => void
}

export function UserQuotaCard({ onNavigate }: UserQuotaCardProps) {
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

  const usedRatio =
    quota && quota.limit > 0
      ? Math.min(1, Math.max(0, quota.used / quota.limit))
      : 0

  const exhausted = quota != null && quota.remaining <= 0
  const lowQuota = quota != null && quota.remaining === 1

  const statusDotClass = error
    ? "bg-rose-600 dark:bg-rose-400"
    : exhausted
      ? "bg-rose-600 dark:bg-rose-400"
      : lowQuota
        ? "bg-amber-500 dark:bg-amber-400"
        : quota
          ? "bg-emerald-600 dark:bg-emerald-400"
          : "bg-muted-foreground/50"

  const barClass = exhausted
    ? "bg-rose-600 dark:bg-rose-400"
    : lowQuota
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-primary"

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
    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/35 p-3 text-card-foreground shadow-2xs dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgb(255,255,255,0.06)]">
      {/* Compact Profile Link Row */}
      <Link
        href="/user/profile"
        onClick={onNavigate}
        className="group flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors duration-120 hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-white/[0.06]"
      >
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-bold text-primary-foreground shadow-2xs"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className="truncate text-sm font-semibold text-foreground group-hover:text-primary"
            title={fullName}
          >
            {fullName}
          </p>
          {quota?.rankName ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
              <ShieldStar aria-hidden="true" size={12} weight="fill" />
              <span className="truncate">{quota.rankName}</span>
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">Hồ sơ cá nhân</p>
          )}
        </div>
      </Link>

      {/* Inline Daily Quota Progress */}
      <div
        className="space-y-2 border-t border-border/70 pt-3 dark:border-white/10"
        aria-busy={isLoading}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", statusDotClass)}
            />
            <span id={quotaLabelId} className="text-muted-foreground">
              Lượt còn lại
            </span>
          </div>

          <span className="font-semibold text-foreground tabular-nums">
            {quota ? `${quota.remaining}/${quota.limit}` : "—/—"}
          </span>
        </div>

        {quota ? (
          <div
            role="progressbar"
            aria-labelledby={quotaLabelId}
            aria-valuemin={0}
            aria-valuemax={quota.limit || 1}
            aria-valuenow={Math.min(quota.used, quota.limit)}
            aria-valuetext={`Còn ${quota.remaining} trên ${quota.limit} lượt hôm nay`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-border/80 dark:bg-white/10"
          >
            <motion.div
              className={cn("h-full w-full origin-left rounded-full", barClass)}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: usedRatio }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
            />
          </div>
        ) : (
          <p role="status" className="text-xs text-muted-foreground">
            {isLoading ? "Đang tải hạn mức…" : "Chưa có thông tin hạn mức"}
          </p>
        )}

        {error && (
          <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-rose-700 dark:text-rose-400">
            <p role="status" className="truncate">
              {error}
            </p>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void fetchQuota()}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            >
              <ArrowClockwise aria-hidden="true" size={12} weight="bold" />
              <span>Thử lại</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
