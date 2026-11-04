"use client"

import { useState } from "react"
import {
  Bank,
  ChatText,
  Link as LinkIcon,
  Phone,
  Camera,
  ClipboardText,
  Trash,
  Lightning,
  CircleNotch,
  FileArrowUp,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { CheckType } from "@/features/check/types/check.types"

export interface ScamCheckInputProps {
  onAnalyze: (content: string, type: CheckType) => void
  isLoading?: boolean
}

export function ScamCheckInput({ onAnalyze, isLoading = false }: ScamCheckInputProps) {
  const [activeTab, setActiveTab] = useState<CheckType>("TEXT")
  const [content, setContent] = useState("")
  const [clipboardError, setClipboardError] = useState<string | null>(null)

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
      type: "OCR",
      label: "Tải ảnh chụp màn hình (OCR)",
      icon: Camera,
    },
  ]

export function ScamCheckInput({
  inputType,
  content,
  onTypeChange,
  onContentChange,
  onAnalyze,
  isLoading,
  error,
}: ScamCheckInputProps) {
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const selected = options.find((option) => option.type === inputType)!
  const handlePaste = async () => {
    setClipboardError(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setContent(text)
      }
    } catch {
      setClipboardError(
        "Không thể đọc bộ nhớ tạm. Vui lòng dán trực tiếp vào ô nhập nội dung."
      )
    }
  }

  const handleClear = () => {
    setContent("")
    setClipboardError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isLoading) return
    onAnalyze(content.trim(), activeTab)
  }

  // Count characters, links, and phone numbers in content
  const charCount = content.length
  const linksCount = (content.match(/https?:\/\/[^\s]+/g) || []).length
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
                    setActiveTab(tab.type)
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
              {charCount} ký tự • Đã phát hiện {linksCount} liên kết, {phoneCount}{" "}
              số điện thoại
            </span>
          </div>

          {/* Textarea */}
          <textarea
            id="user-check-content"
            aria-label="Nội dung khả nghi cần phân tích"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              activeTab === "URL"
                ? "Nhập hoặc dán đường dẫn website (URL) nghi vấn..."
                : activeTab === "PHONE"
                  ? "Nhập số điện thoại hoặc đầu số tổng đài khả nghi..."
                  : "Nhập hoặc dán nội dung tin nhắn, đường link hoặc số điện thoại đáng ngờ..."
            }
            className="w-full resize-none rounded-xl bg-[#FAF8FF] p-4 text-xs leading-relaxed text-[#131B2E] placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-[#008CC7] focus:outline-hidden dark:bg-muted/40 dark:text-foreground"
          />

          {/* OCR Dropzone (Shown when OCR tab is active) */}
          {activeTab === "OCR" && (
            <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-dashed border-[#C6C6CE] bg-[#FAF8FF]/60 p-4 transition-colors hover:border-[#008CC7]/50 sm:flex-row dark:border-border dark:bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E2E7FF] text-[#008CC7] dark:bg-primary/20 dark:text-primary">
                  <Camera size={22} weight="fill" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#131B2E] dark:text-foreground">
                    Kéo thả ảnh chụp màn hình tin nhắn hoặc biên lai chuyển khoản
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Hệ thống tự động bóc tách chữ qua OCR quang học (PNG, JPG, HEIC tối đa 15MB)
                  </p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#C6C6CE]/70 bg-white px-3.5 py-2 text-xs font-bold text-[#131B2E] shadow-2xs hover:bg-[#F2F3FF] dark:border-border dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                <FileArrowUp size={15} weight="bold" />
                <span>Chọn tệp tin</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setContent(`[Ảnh chụp màn hình: ${file.name}]`)
                    }
                  }}
                />
              </label>
            </div>
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
              disabled={isLoading || !content.trim()}
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
