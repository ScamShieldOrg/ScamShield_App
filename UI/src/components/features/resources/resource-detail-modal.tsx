"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Check,
  Copy,
  Globe,
  PhoneCall,
  ShieldCheck,
  ShieldWarning,
  X,
} from "@phosphor-icons/react"
import type { BlackItem } from "@/types/resource"
import { cn } from "@/lib/utils"
import {
  formatResourceDate,
  getResourceTypeMeta,
  getSeverityMeta,
  type WhitelistViewItem,
} from "./resource-helpers"

interface ResourceDetailModalProps {
  blacklistItem: BlackItem | null
  whitelistItem: WhitelistViewItem | null
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
  onClose: () => void
}

export function ResourceDetailModal({
  blacklistItem,
  whitelistItem,
  copiedKey,
  onCopy,
  onClose,
}: ResourceDetailModalProps) {
  const isOpen = Boolean(blacklistItem || whitelistItem)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {blacklistItem && (
        <motion.div
          key="blacklist-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blacklist-modal-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-card shadow-[0_16px_44px_rgb(15,23,42,0.18)] dark:border-white/12 dark:shadow-[0_24px_60px_rgb(0,0,0,0.6),inset_0_1px_0_rgb(255,255,255,0.08)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/70 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">
                  <ShieldWarning aria-hidden="true" size={20} weight="fill" />
                </div>
                <div>
                  <h2
                    id="blacklist-modal-title"
                    className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground"
                  >
                    Hồ sơ cảnh báo vi phạm
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    Mã hồ sơ: BL-{blacklistItem.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" size={18} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="divide-y divide-border/70">
              <div className="space-y-2 bg-rose-500/5 p-5 dark:bg-rose-500/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                    Đối tượng bị cảnh báo
                  </span>
                  <span className="inline-flex items-center rounded-md border border-rose-500/25 bg-card px-2 py-0.5 font-mono text-xs font-semibold text-rose-800 tabular-nums dark:text-rose-200">
                    {(blacklistItem.warningCount ?? 0).toLocaleString("vi-VN")}{" "}
                    lượt báo cáo
                  </span>
                </div>
                <p className="font-mono text-base font-bold break-all text-foreground">
                  {blacklistItem.title}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Loại tài nguyên
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {getResourceTypeMeta(blacklistItem.resourceType).label}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Mức độ cảnh báo
                  </dt>
                  <dd>
                    {(() => {
                      const sev = getSeverityMeta(
                        blacklistItem.severity,
                        blacklistItem.severityLabel
                      )
                      return (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
                            sev.badgeClass
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn("size-1.5 rounded-full", sev.dotClass)}
                          />
                          <span>{sev.label}</span>
                        </span>
                      )
                    })()}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Thời điểm xác nhận
                  </dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">
                    {formatResourceDate(blacklistItem.confirmedAt)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Cập nhật gần nhất
                  </dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">
                    {formatResourceDate(blacklistItem.updatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="space-y-1.5 p-5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Nội dung kiểm duyệt
                </p>
                <p className="max-w-[60ch] text-sm leading-relaxed text-foreground">
                  {blacklistItem.description || "Chưa có mô tả chi tiết."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Đóng hồ sơ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {whitelistItem && (
        <motion.div
          key="whitelist-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whitelist-modal-title"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-black/10 bg-card shadow-[0_16px_44px_rgb(15,23,42,0.18)] dark:border-white/12 dark:shadow-[0_24px_60px_rgb(0,0,0,0.6),inset_0_1px_0_rgb(255,255,255,0.08)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/70 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  <ShieldCheck aria-hidden="true" size={20} weight="fill" />
                </div>
                <div>
                  <h2
                    id="whitelist-modal-title"
                    className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground"
                  >
                    Hồ sơ thẩm định định danh
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    Mã xác thực: {whitelistItem.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" size={18} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="divide-y divide-border/70">
              <div className="space-y-1 bg-muted/30 p-5">
                <p className="font-heading text-base font-bold text-foreground">
                  {whitelistItem.name}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {whitelistItem.description}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">Trạng thái</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {whitelistItem.authority}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Ngày phê chuẩn
                  </dt>
                  <dd className="text-sm font-semibold text-foreground tabular-nums">
                    {whitelistItem.verifiedAt}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">Mã số thuế</dt>
                  <dd className="font-mono text-sm font-semibold text-foreground tabular-nums">
                    {whitelistItem.taxId || "Đang cập nhật"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    Lý do phê duyệt
                  </dt>
                  <dd className="text-sm font-medium break-words text-foreground">
                    {whitelistItem.verificationReason ||
                      "Đơn vị đã hoàn tất xác minh danh tính"}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2.5 p-5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Kênh liên hệ chính thống
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <div className="flex min-w-0 items-center gap-2">
                      <PhoneCall
                        aria-hidden="true"
                        size={16}
                        weight="bold"
                        className="shrink-0"
                      />
                      <span className="font-mono text-sm font-semibold break-all tabular-nums">
                        {whitelistItem.hotline}
                      </span>
                    </div>
                    {whitelistItem.hotline !== "Chưa cập nhật" && (
                      <button
                        type="button"
                        onClick={() =>
                          onCopy(whitelistItem.hotline, "modal-hotline")
                        }
                        className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-emerald-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {copiedKey === "modal-hotline" ? (
                          <>
                            <Check aria-hidden="true" size={14} weight="bold" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy aria-hidden="true" size={14} />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200">
                    <div className="flex min-w-0 items-center gap-2">
                      <Globe
                        aria-hidden="true"
                        size={16}
                        weight="bold"
                        className="shrink-0"
                      />
                      <span className="font-mono text-sm font-medium break-all">
                        {whitelistItem.website}
                      </span>
                    </div>
                    {whitelistItem.website !== "Chưa cập nhật" && (
                      <button
                        type="button"
                        onClick={() =>
                          onCopy(whitelistItem.website, "modal-website")
                        }
                        className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold hover:bg-sky-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {copiedKey === "modal-website" ? (
                          <>
                            <Check aria-hidden="true" size={14} weight="bold" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy aria-hidden="true" size={14} />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-[opacity,transform] duration-120 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Đóng thông tin
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
