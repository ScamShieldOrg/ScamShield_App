"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  Bank,
  ChatText,
  CircleNotch,
  ClipboardText,
  Info,
  Lightning,
  Link as LinkIcon,
  MagnifyingGlass,
  Phone,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { CheckType } from "@/features/check/types/check.types"
import {
  CHECK_TAB_META,
  CHECK_TAB_ORDER,
  countMessageEntities,
  detectSuggestedCheckType,
  getInlineFormatError,
} from "./scam-input-helpers"

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
  /** Increment to smoothly scroll to and focus the active input field. */
  focusSignal?: number
}

const TAB_ICONS: Record<CheckType, typeof ChatText> = {
  TEXT: ChatText,
  URL: LinkIcon,
  PHONE: Phone,
  BANK_ACCOUNT: Bank,
}

const UNDO_TIMEOUT_MS = 7000

export function ScamCheckInput({
  activeTab,
  onTabChange,
  drafts,
  onDraftChange,
  onAnalyze,
  isLoading = false,
  quotaExhausted = false,
  focusSignal = 0,
}: ScamCheckInputProps) {
  const fieldId = useId()
  const errorId = useId()
  const noteId = useId()

  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<Record<CheckType, HTMLButtonElement | null>>({
    TEXT: null,
    URL: null,
    PHONE: null,
    BANK_ACCOUNT: null,
  })

  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const [showInlineValidation, setShowInlineValidation] = useState(false)
  const [dismissedSuggestionFor, setDismissedSuggestionFor] = useState<
    string | null
  >(null)
  const [undoSnapshot, setUndoSnapshot] = useState<{
    tab: CheckType
    value: string
  } | null>(null)

  const content = drafts[activeTab] ?? ""
  const trimmedContent = content.trim()
  const tabMeta = CHECK_TAB_META[activeTab]

  // Auto-expire undo bar after 7 seconds
  useEffect(() => {
    if (!undoSnapshot) return
    const timer = window.setTimeout(() => setUndoSnapshot(null), UNDO_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [undoSnapshot])

  // Focus & scroll into view when parent requests a fresh check
  useEffect(() => {
    if (focusSignal <= 0) return
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    const target = tabMeta.isMultiline ? textareaRef.current : inputRef.current
    target?.focus()
  }, [focusSignal, tabMeta.isMultiline])

  const entities = useMemo(
    () => (activeTab === "TEXT" ? countMessageEntities(content) : null),
    [activeTab, content]
  )

  const suggestedType = useMemo(() => {
    const detected = detectSuggestedCheckType(content, activeTab)
    if (!detected) return null
    if (dismissedSuggestionFor === trimmedContent) return null
    return detected
  }, [activeTab, content, dismissedSuggestionFor, trimmedContent])

  const inlineFormatError = useMemo(
    () => getInlineFormatError(content, activeTab),
    [activeTab, content]
  )

  const visibleInlineError = showInlineValidation ? inlineFormatError : null
  const canSubmit =
    Boolean(trimmedContent) &&
    !isLoading &&
    !quotaExhausted &&
    !(showInlineValidation && inlineFormatError)

  const updateContent = (value: string) => {
    setClipboardError(null)
    if (value.length > 0 && undoSnapshot?.tab === activeTab) {
      setUndoSnapshot(null)
    }
    if (showInlineValidation && !getInlineFormatError(value, activeTab)) {
      setShowInlineValidation(false)
    }
    onDraftChange(activeTab, value)
  }

  const handleSelectTab = (nextTab: CheckType) => {
    onTabChange(nextTab)
    setClipboardError(null)
    setShowInlineValidation(false)
  }

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex: number | null = null
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % CHECK_TAB_ORDER.length
    } else if (e.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + CHECK_TAB_ORDER.length) % CHECK_TAB_ORDER.length
    } else if (e.key === "Home") {
      nextIndex = 0
    } else if (e.key === "End") {
      nextIndex = CHECK_TAB_ORDER.length - 1
    }

    if (nextIndex === null) return
    e.preventDefault()
    const nextTab = CHECK_TAB_ORDER[nextIndex]
    handleSelectTab(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  const handlePaste = async () => {
    setClipboardError(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        updateContent(text)
        const target = tabMeta.isMultiline
          ? textareaRef.current
          : inputRef.current
        target?.focus()
      }
    } catch {
      setClipboardError(
        "Trình duyệt chưa cấp quyền đọc bộ nhớ tạm. Hãy bấm vào ô nhập và dán bằng Ctrl+V."
      )
    }
  }

  const handleClear = () => {
    if (!content) return
    setUndoSnapshot({ tab: activeTab, value: content })
    onDraftChange(activeTab, "")
    setClipboardError(null)
    setShowInlineValidation(false)
    const target = tabMeta.isMultiline ? textareaRef.current : inputRef.current
    target?.focus()
  }

  const handleUndoClear = () => {
    if (!undoSnapshot) return
    onDraftChange(undoSnapshot.tab, undoSnapshot.value)
    if (undoSnapshot.tab !== activeTab) {
      onTabChange(undoSnapshot.tab)
    }
    setUndoSnapshot(null)
    const target =
      CHECK_TAB_META[undoSnapshot.tab].isMultiline
        ? textareaRef.current
        : inputRef.current
    window.requestAnimationFrame(() => target?.focus())
  }

  const handleApplySuggestedType = () => {
    if (!suggestedType) return
    const valueToMove = trimmedContent
    onDraftChange(suggestedType, valueToMove)
    onDraftChange(activeTab, "")
    onTabChange(suggestedType)
    setShowInlineValidation(false)
    setDismissedSuggestionFor(null)
    window.requestAnimationFrame(() => {
      const nextTarget = CHECK_TAB_META[suggestedType].isMultiline
        ? textareaRef.current
        : inputRef.current
      nextTarget?.focus()
    })
  }

  const triggerSubmit = () => {
    if (!trimmedContent || isLoading || quotaExhausted) return
    if (inlineFormatError) {
      setShowInlineValidation(true)
      return
    }
    onAnalyze(trimmedContent, activeTab)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerSubmit()
  }

  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    // Allow Ctrl+Z / Cmd+Z on an empty field to restore recently cleared text
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z" &&
      !content &&
      undoSnapshot &&
      undoSnapshot.tab === activeTab
    ) {
      e.preventDefault()
      handleUndoClear()
      return
    }

    if (tabMeta.isMultiline && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      triggerSubmit()
    }
  }

  const isCuratedLookup = activeTab === "PHONE" || activeTab === "BANK_ACCOUNT"
  const describedBy = [
    visibleInlineError ? errorId : null,
    tabMeta.scopeNote ? noteId : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-busy={isLoading}
      noValidate
      className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs dark:border-white/10"
    >
      <fieldset disabled={isLoading} className="min-w-0">
        <legend className="sr-only">Kiểm tra nội dung đáng ngờ</legend>

        {/* Zone 1: Accessible Segmented Tablist */}
        <div className="border-b border-border/80 bg-muted/40 p-2 dark:border-white/10 dark:bg-muted/25">
          <div
            role="tablist"
            aria-label="Chọn loại nội dung cần kiểm tra"
            className="grid grid-cols-2 gap-1 sm:grid-cols-4"
          >
            {CHECK_TAB_ORDER.map((type, index) => {
              const Icon = TAB_ICONS[type]
              const meta = CHECK_TAB_META[type]
              const isActive = activeTab === type
              const hasHiddenDraft =
                !isActive && Boolean((drafts[type] ?? "").trim())

              return (
                <button
                  key={type}
                  ref={(node) => {
                    tabRefs.current[type] = node
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleSelectTab(type)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={cn(
                    "relative inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition-[color,background-color,box-shadow] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    isActive
                      ? "bg-background text-foreground shadow-2xs ring-1 ring-border dark:bg-card dark:ring-white/15"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground dark:hover:bg-white/5"
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    size={16}
                    weight={isActive ? "fill" : "regular"}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{meta.shortLabel}</span>
                  {hasHiddenDraft && (
                    <span
                      aria-label="Có nội dung đang soạn"
                      title="Có nội dung đang soạn"
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Zone 2: Adaptive Input Area */}
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor={fieldId}
              className="text-sm font-semibold text-foreground"
            >
              {tabMeta.label}
            </label>

            {activeTab === "TEXT" && entities ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                <span>{entities.chars.toLocaleString("vi-VN")} ký tự</span>
                {entities.urls > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
                    {entities.urls} liên kết
                  </span>
                )}
                {entities.phones > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    {entities.phones} SĐT
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {activeTab === "BANK_ACCOUNT"
                  ? "6–30 chữ số"
                  : activeTab === "PHONE"
                    ? "Số di động hoặc 1800/1900"
                    : "Đường dẫn hoặc tên miền"}
              </span>
            )}
          </div>

          {tabMeta.isMultiline ? (
            <textarea
              ref={textareaRef}
              id={fieldId}
              rows={4}
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              onBlur={() => {
                if (trimmedContent && inlineFormatError) {
                  setShowInlineValidation(true)
                }
              }}
              onKeyDown={handleFieldKeyDown}
              aria-invalid={Boolean(visibleInlineError)}
              aria-describedby={describedBy || undefined}
              placeholder={tabMeta.placeholder}
              className={cn(
                "min-h-[112px] max-h-[280px] w-full resize-y rounded-md border bg-background px-4 py-3 text-sm leading-relaxed text-foreground caret-primary transition-[border-color,box-shadow] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] selection:bg-primary/15 placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-background/60",
                visibleInlineError
                  ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-input dark:border-white/12"
              )}
            />
          ) : (
            <input
              ref={inputRef}
              id={fieldId}
              type="text"
              inputMode={tabMeta.inputMode}
              autoComplete="off"
              spellCheck={false}
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              onBlur={() => {
                if (trimmedContent && inlineFormatError) {
                  setShowInlineValidation(true)
                }
              }}
              onKeyDown={handleFieldKeyDown}
              aria-invalid={Boolean(visibleInlineError)}
              aria-describedby={describedBy || undefined}
              placeholder={tabMeta.placeholder}
              className={cn(
                "h-12 w-full rounded-md border bg-background px-4 font-mono text-sm text-foreground caret-primary transition-[border-color,box-shadow] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] selection:bg-primary/15 placeholder:font-sans placeholder:text-muted-foreground/80 focus:border-ring focus:ring-2 focus:ring-ring/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-background/60",
                visibleInlineError
                  ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                  : "border-input dark:border-white/12"
              )}
            />
          )}

          {/* Smart Auto-Detect Tab Suggestion (when user pastes URL/Phone/Bank into TEXT) */}
          {suggestedType && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 transition-opacity duration-180 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-100">
              <div className="flex items-center gap-2">
                <ArrowsLeftRight
                  aria-hidden="true"
                  size={15}
                  weight="bold"
                  className="shrink-0 text-sky-700 dark:text-sky-300"
                />
                <span>
                  Nội dung này giống{" "}
                  <strong className="font-semibold">
                    {CHECK_TAB_META[suggestedType].shortLabel}
                  </strong>
                  . Chuyển tab để kiểm tra chính xác hơn?
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleApplySuggestedType}
                  className="inline-flex h-7 cursor-pointer items-center rounded-md bg-sky-700 px-2.5 text-xs font-semibold text-white transition-colors duration-120 hover:bg-sky-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  Chuyển sang {CHECK_TAB_META[suggestedType].shortLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedSuggestionFor(trimmedContent)}
                  aria-label="Đóng gợi ý chuyển tab"
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-sky-800 transition-colors duration-120 hover:bg-sky-500/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-200"
                >
                  <X aria-hidden="true" size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* Inline Field-Level Format Validation */}
          {visibleInlineError && (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-400"
            >
              <WarningCircle
                aria-hidden="true"
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <span>{visibleInlineError}</span>
            </p>
          )}

          {/* Reversible Clear Undo Bar */}
          {undoSnapshot && undoSnapshot.tab === activeTab && !content && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-foreground dark:border-white/10"
            >
              <span>Đã xóa nội dung vừa nhập.</span>
              <button
                type="button"
                onClick={handleUndoClear}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-foreground ring-1 ring-border transition-colors duration-120 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:ring-white/15"
              >
                <ArrowCounterClockwise
                  aria-hidden="true"
                  size={13}
                  weight="bold"
                />
                <span>Hoàn tác</span>
                <kbd className="hidden rounded bg-muted px-1 font-mono text-[12px] text-muted-foreground sm:inline">
                  Ctrl+Z
                </kbd>
              </button>
            </div>
          )}

          {/* Clipboard Fallback Error */}
          {clipboardError && (
            <p
              role="alert"
              className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-400"
            >
              <WarningCircle
                aria-hidden="true"
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <span>{clipboardError}</span>
            </p>
          )}

          {/* Honest Scope Note (for curated directory lookup tabs) */}
          {tabMeta.scopeNote && (
            <p
              id={noteId}
              className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
            >
              <Info
                aria-hidden="true"
                size={15}
                weight="bold"
                className="mt-0.5 shrink-0 text-muted-foreground"
              />
              <span>{tabMeta.scopeNote}</span>
            </p>
          )}
        </div>

        {/* Zone 3: Action Toolbar & Primary CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/25 px-4 py-3 sm:px-5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePaste()}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-[background-color,border-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12"
            >
              <ClipboardText aria-hidden="true" size={15} weight="bold" />
              <span>Dán nhanh</span>
            </button>

            {content.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground transition-[color,background-color] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash aria-hidden="true" size={15} weight="bold" />
                <span>Xóa</span>
              </button>
            )}
          </div>

          <div className="flex w-full items-center gap-3 sm:w-auto">
            {!quotaExhausted && !isLoading && (
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground dark:border-white/12">
                  {tabMeta.isMultiline ? "Ctrl + Enter" : "Enter"}
                </kbd>
              </span>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              title={
                quotaExhausted
                  ? "Bạn đã dùng hết hạn mức kiểm tra hôm nay"
                  : !trimmedContent
                    ? "Nhập nội dung để bắt đầu kiểm tra"
                    : undefined
              }
              className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-2xs transition-[opacity,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            >
              {isLoading ? (
                <CircleNotch
                  aria-hidden="true"
                  size={16}
                  weight="bold"
                  className="motion-safe:animate-spin"
                />
              ) : isCuratedLookup ? (
                <MagnifyingGlass aria-hidden="true" size={16} weight="bold" />
              ) : (
                <Lightning aria-hidden="true" size={16} weight="fill" />
              )}
              <span>
                {isLoading
                  ? tabMeta.loadingLabel
                  : quotaExhausted
                    ? "Hết lượt hôm nay"
                    : tabMeta.submitLabel}
              </span>
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  )
}
