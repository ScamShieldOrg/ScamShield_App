"use client"

import { useState } from "react"
import {
  Bank,
  ChatText,
  Link as LinkIcon,
  Phone,
  ClipboardText,
  Trash,
  Lightning,
  CircleNotch,
  Info,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { CheckType } from "@/features/check/types/check.types"

export interface ScamCheckInputProps {
  /** Tab the user is composing in. The parent owns it so drafts survive switches. */
  activeTab: CheckType
  onTabChange: (type: CheckType) => void
  /** One draft per tab: switching tabs must never drop what the user typed. */
  drafts: Record<CheckType, string>
  onDraftChange: (type: CheckType, value: string) => void
  onAnalyze: (content: string, type: CheckType) => void
  isLoading?: boolean
  /** Blocks submitting and explains why when the daily quota is used up. */
  quotaExhausted?: boolean
}

export function ScamCheckInput({
  activeTab,
  onTabChange,
  drafts,
  onDraftChange,
  onAnalyze,
  isLoading = false,
  quotaExhausted = false,
}: ScamCheckInputProps) {
  const [clipboardError, setClipboardError] = useState<string | null>(null)

  // The draft of the visible tab only: each tab keeps its own text.
  const content = drafts[activeTab] ?? ""

  const updateContent = (value: string) => onDraftChange(activeTab, value)

  const tabs: { type: CheckType; label: string; icon: typeof ChatText }[] = [
    {
      type: "TEXT",
      label: "Tin nhắn / Nội dung văn bản",
      icon: ChatText,
    },
    {
      type: "URL",
      label: "Đường dẫn (URL / Domain)",
      icon: LinkIcon,
    },
    {
      type: "PHONE",
      label: "Số điện thoại / Đầu số",
      icon: Phone,
    },
    {
      type: "BANK_ACCOUNT",
      label: "Ngân hàng / Số tài khoản",
      icon: Bank,
    },
  ]

  const handlePaste = async () => {
    setClipboardError(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        updateContent(text)
      }
    } catch {
      setClipboardError(
        "Không thể đọc bộ nhớ tạm. Vui lòng dán trực tiếp vào ô nhập nội dung."
      )
    }
  }

  const handleClear = () => {
    updateContent("")
    setClipboardError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isLoading || quotaExhausted) return
    onAnalyze(content.trim(), activeTab)
  }

  // Count characters, links, and phone numbers in content
  const charCount = content.length
  // Full URLs (scheme or www.) always count; bare domains need a known lowercase TLD,
  // so a missing space after a period ("khac.Do") is not miscounted as a link.
  const urlPattern = new RegExp(
    "https?:\\/\\/[^\\s<>\"']+|www\\.[^\\s<>\"']+|(?<![\\w@.])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:com|net|org|info|biz|vn|io|co|me|to|cc|tv|xyz|top|vip|shop|online|site|club|app|link|live|store|asia|tk|ml|ga|cf|gq|icu|cyou|bond|sbs|click|fun|pro|win|bet|best|life|world|today|news|space|website|tech|dev|ly|gl|gd|in|us|uk|cn|ru)\\b(?:\\/[^\\s<>\"']*)?",
    "g"
  )
  const linksCount = new Set(content.match(urlPattern) || []).size
  const phoneCount = (content.match(/(0\d{9,10}|\+84\d{9,10})/g) || []).length

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isLoading}
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      <fieldset disabled={isLoading} className="min-w-0 space-y-4">
        {/* Navigation Tabs */}
        <div>
          <legend className="sr-only">Chọn phương thức kiểm tra</legend>
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.type
              return (
                <button
                  key={tab.type}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    onTabChange(tab.type)
                    setClipboardError(null)
                  }}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    isActive
                      ? "bg-[#008CC7] text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden="true" size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Input Box */}
        <div className="rounded-2xl border border-[#C6C6CE]/40 bg-white p-5 shadow-xs dark:border-border dark:bg-card">
          {/* Header / Stats */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <label
              htmlFor="user-check-content"
              className="flex cursor-pointer items-center gap-2"
            >
              <ChatText
                size={16}
                weight="bold"
                className="text-[#131B2E] dark:text-foreground"
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-[#131B2E] dark:text-foreground">
                Nội dung khả nghi cần phân tích
              </span>
            </label>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {charCount} ký tự • Đã phát hiện {linksCount} liên kết,{" "}
              {phoneCount} số điện thoại
            </span>
          </div>

          {/* Textarea */}
          <textarea
            id="user-check-content"
            aria-label="Nội dung khả nghi cần phân tích"
            rows={4}
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder={
              activeTab === "URL"
                ? "Nhập hoặc dán đường dẫn website (URL) nghi vấn..."
                : activeTab === "PHONE"
                  ? "Nhập số điện thoại hoặc đầu số tổng đài khả nghi..."
                  : activeTab === "BANK_ACCOUNT"
                    ? "Nhập số tài khoản nghi vấn (chữ số, có thể cách nhau bằng dấu cách, dấu chấm hoặc gạch nối — ví dụ: 0123 456 789)..."
                    : "Nhập hoặc dán nội dung tin nhắn, đường link hoặc số điện thoại đáng ngờ..."
            }
            className="w-full resize-none rounded-xl bg-[#FAF8FF] p-4 text-xs leading-relaxed text-[#131B2E] placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:bg-muted/40 dark:text-foreground"
          />

          {activeTab === "BANK_ACCOUNT" && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
              <span>
                Chỉ tra cứu trong danh sách cảnh báo và danh bạ xác minh — không
                dùng AI phán đoán. Số tài khoản không có trong danh sách không
                đồng nghĩa với an toàn.
              </span>
            </p>
          )}

          {/* Action Toolbar & CTA */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#C6C6CE]/30 pt-4 dark:border-border">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePaste()}
              >
                <ClipboardText aria-hidden="true" />
                <span>Dán nhanh</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
              >
                <Trash size={15} weight="bold" />
                <span>Xóa nội dung</span>
              </Button>
            </div>
            <Button
              type="submit"
              disabled={isLoading || quotaExhausted || !content.trim()}
              className="cursor-pointer bg-[#008CC7] text-white hover:bg-[#007AB0] dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              {isLoading ? (
                <CircleNotch
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              ) : (
                <Lightning aria-hidden="true" weight="fill" />
              )}
              <span>{isLoading ? "Đang phân tích…" : "Phân tích"}</span>
            </Button>
          </div>

          {quotaExhausted && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400"
            >
              <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
              <span>
                Bạn đã dùng hết hạn mức kiểm tra hôm nay nên chưa thể gửi nội
                dung mới. Hạn mức được đặt lại lúc 00:00 giờ Việt Nam.
              </span>
            </p>
          )}
        </div>
      </fieldset>
      {clipboardError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {clipboardError}
        </p>
      )}
    </form>
  )
}
